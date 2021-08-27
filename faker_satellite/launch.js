const fs = require('fs');
const https = require('https');
const path = require('path');
const process = require('process');
const { URLSearchParams } = require('url');

const latLongs = require('./utils/latLongs');
const startTelemetry = require('./utils/startTelemetry');
const commandDefinitions = require('../connect/command_definitions.json');

const { command_definitions: { system: systemName } } = commandDefinitions;
const FIVE_MINUTES = 1000 * 60 * 5;
const THREE_MINUTES = 1000 * 60 * 3;
const fileReceivers = {};
let sendTelem = false;
let fetchTimeout;

const gri = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1) + min);
};

const shouldSendTelem = () => sendTelem;

const satelliteTelemetry = startTelemetry({
  sendFn: shouldSendTelem,
  dest: process,
  systemName,
});

const generateImageProps = sps => {
  const [lat, lon] = latLongs[Math.floor(Math.random() * latLongs.length)];

  sps.append('lat', lat);
  sps.append('lon', lon);
  sps.append('date', `${gri(2018, 2020)}-${gri(1, 12)}-${gri(1, 28)}`);
  sps.append('dim', Math.max(0.1, Math.random().toFixed(1)));
  sps.append('api_key', 'H2h0qcafdSzA4AaikbHGNR6epQ6w3NFLWQq7hho1');

  return sps;
};

const retrieveImageFile = () => {
  if (fetchTimeout) { clearTimeout(fetchTimeout); }

  const sp = generateImageProps(new URLSearchParams());
  const newFilePath = path.join(__dirname, 'for_downlink', `${Date.now()}_${sp.get('date')}.jpg`);
  const createStream = fs.createWriteStream(newFilePath);
  const clientReq = https.get(`https://api.nasa.gov/planetary/earth/imagery?${sp.toString()}`, (res) => {
    res.on('data', chunk => {
      createStream.write(chunk);
    });

    res.on('end', chunk => {
      if (chunk) {
        createStream.write(chunk);
      }
      clearTimeout(fetchTimeout);
      createStream.end();

      const existing = fs.readdirSync(path.join(__dirname, 'for_downlink')).sort();

      while (existing.length > 16) {
        const filenameToUnlink = existing.shift();

        fs.unlinkSync(path.join(__dirname, 'for_downlink', filenameToUnlink));
      }

      fetchTimeout = setTimeout(retrieveImageFile, FIVE_MINUTES);
    });

    res.on('error', () => {
      createStream.end();

      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }
    });
  });

  clientReq.on('error', () => null);
};

// Internal helper functions
const acknowledgeCommand = ({ id }) => {
  process.send(JSON.stringify({
    type: 'command_update',
    command: {
      id,
      state: 'acked_by_system',
    },
  }));
};

const completeCommand = ({ id, payload }) => {
  process.send(JSON.stringify({
    type: 'command_update',
    command: {
      id,
      payload,
      state: 'completed',
    },
  }));
};

const failCommand = ({ id, errors }) => {
  process.send(JSON.stringify({
    type: 'command_update',
    command: {
      id,
      state: 'failed',
      errors: (Array.isArray(errors) ? errors: [errors]).map(e => e.toString()),
    },
  }));
};

// Command functions
const ping = ({ id }) => {
  completeCommand({ id, payload: 'pong' });
};

const safemode = () => {
  satelliteTelemetry.safe();
};

const telemetry = ({ id }) => {
  sendTelem = true;
  completeCommand({ id, payload: 'telemetry started' });
  setTimeout(() => {
    sendTelem = false;
  }, THREE_MINUTES);
};

const uplink_file_chunk = ({ id, chunk }) => {
  let receiveStream;

  if (fileReceivers[id]) {
    receiveStream = fileReceivers[id];
  } else {
    if (!fs.existsSync(path.join(__dirname, 'file_lib'))) {
      fs.mkdirSync(path.join(__dirname, 'file_lib'));
    }

    receiveStream = fs.createWriteStream(path.join(__dirname, 'file_lib', `file_${id}`));
    fileReceivers[id] = receiveStream;
  }

  receiveStream.write(Buffer.from(chunk.data));
};

const uplink_ended = ({ id }) => {
  fileReceivers[id].end();

  process.send(JSON.stringify({
    type: 'command_update',
    command: {
      id,
      state: 'executing_on_system',
    },
  }));

  const fileExists = fs.existsSync(path.join(__dirname, 'file_lib', `file_${id}`));

  if (fileExists) {
    completeCommand({ id, payload: 'file verified' });
  } else {
    failCommand({ id, errors: new Error('Couldn\'t verify file transfer').toString() });
  }

  delete fileReceivers[id];
};

const checksum_ping = ({ word }) => {
  const pongTimeout = setTimeout(() => {
    clearTimeout(pongTimeout);
    process.send({ type: 'checksum_pong', word });
  }, (Math.random() + 0.5) * 1000);
};

const update_file_list = ({ id, system }) => {
  const state = 'executing_on_system';

  process.send(JSON.stringify({
    type: 'command_update',
    command: { id, state },
  }));

  fs.readdir(path.join(__dirname, 'for_downlink'), (errors, files) => {
    if (errors) {
      failCommand({ id, errors });
    } else {
      const progress_1_label = 'Files for downlink accessed';
      const progress_1_max = files.length;
      let progress_1_current = 0;

      Promise.all(files.map(fileName => new Promise((resolve, reject) => {
        fs.stat(path.join(__dirname, 'for_downlink', fileName), (err, result) => {
          if (err) {
            reject(err);
          } else {
            progress_1_current += 1;
            process.send(JSON.stringify({
              type: 'command_update',
              command: { id, state, progress_1_current, progress_1_label, progress_1_max },
            }));

            resolve({ ...result, fileName: path.join('.', 'for_downlink', fileName) });
          }
        });
      }))).then(filesWithStats => {
        process.send(JSON.stringify({
          type: 'command_update',
          command: {
            id,
            state: 'downlinking_from_system',
          }
        }));
        process.send(JSON.stringify({
          type: 'file_list',
          file_list: {
            system,
            timestamp: Date.now(),
            files: filesWithStats.map(f => ({ name: f.fileName, size: f.size, timestamp: f.birthtimeMs })),
          }
        }));
        completeCommand({ id, payload: 'File list update complete' });
      }).catch(errors => {
        failCommand({ id, errors });
      });
    }
  });
};

const downlink_file = ({ id, filename }) => {
  const dlStream = fs.createReadStream(path.join(__dirname, filename));

  process.send(JSON.stringify({
    type: 'command_update',
    command: {
      id,
      state: 'executing_on_system',
    },
  }));

  dlStream.on('data', chunk => {
    process.send({
      type: 'file_contents_update',
      downlink_id: id,
      chunk,
    });
  });

  dlStream.on('end', chunk => {
    process.send({
      type: 'file_contents_finished',
      downlink_id: id,
      chunk,
    });
  });

  dlStream.on('error', error => {
    process.send(JSON.stringify({
      type: 'command_update',
      command: {
        id,
        state: 'failed',
        errors: [error.toString()],
      },
    }));
  });
};

const satCommands = {
  ping,
  update_file_list,
  downlink_file,
  safemode,
  telemetry,
};

const intermediateCommands = {
  uplink_file_chunk,
  uplink_ended,
  checksum_ping,
};


process.on('message', obj => {
  const { type } = obj;

  if (satCommands[type]) {
    acknowledgeCommand(obj);
    satCommands[type](obj);
  } else if (intermediateCommands[type]) {
    intermediateCommands[type](obj);
  } else {
    process.send(JSON.stringify({
      type: 'event',
      event: {
        type: 'satelliteError',
        level: 'error',
        message: `Satellite did not recognize command type ${type}`,
        debug: obj,
      },
    }));
  }
});

if (!fs.existsSync(path.join(__dirname, "for_downlink"))) {
  fs.mkdirSync(path.join(__dirname, 'for_downlink'));
}

retrieveImageFile();
process.send(commandDefinitions);
