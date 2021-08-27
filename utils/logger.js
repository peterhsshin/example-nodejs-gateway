const { Writable } = require('stream');

const chalk = require('chalk');

const options = ['year', 'month', 'day', 'hour', 'minute', 'second'].reduce((accum, curr) => ({
  ...accum, [curr]: 'numeric',
}), { hour12: false });
const schemes = {
  event: 'green',
  command: 'blueBright',
};

const logStream = new Writable({
  write: (chunk, _, cb) => {
    const [type, dtg, ...rest] = chunk.toString().split('\n');
    const chalkColor = schemes[type] || 'white';
    const messageStr = rest.join(' ');

    console.log(
      chalk[chalkColor](
        `${type.toUpperCase()} UPDATE-${dtg.replace(', ', '-')}-${messageStr.length < 180 ? messageStr : `${messageStr.slice(0, 180)}...`}`
      )
    );
    cb();
  }
})

const blinkLoadingText = text => new Promise(resolve => {
  const interval = 500;
  let wait = 2200;

  const switchText = () => {
    text = text === 'Loading   ' ? 'Loading...' : 'Loading   ';
  };

  const blinkInterval = setInterval(() => {
    if (wait <= 0) {
      clearInterval(blinkInterval);
      resolve();
    } else {
      switchText();
      console.clear();
      console.log(chalk.black.bgCyan(text));
      wait -= interval;
    }
  }, interval);
});

const asynctitle = () => {
  const ln2 = '            _                 _                               _     ';
  const ln1 = '           | |               | |                             (_)    ';
  const l0 = '  _ __ ___ | |_    __ _  __ _| |_ _____      ____ _ _   _     _ ___ ';
  const l1 = ' | \'_ ` _ \\| __|  / _` |/ _` | __/ _ \\ \\ /\\ / / _` | | | |   | / __|';
  const l2 = ' | | | | | | |_  | (_| | (_| | ||  __/\\ V  V / (_| | |_| |   | \\__ \\';
  const l3 = ' |_| |_| |_|\\__|  \\__, |\\__,_|\\__\\___| \\_/\\_/ \\__,_|\\__, |   | |___/';
  const l4 = '                   __/ |                             __/ |  _/ |    ';
  const l5 = '                  |___/                             |___/  |__/    ';

  const intro = [ln2, ln1, l0, l1, l2, l3, l4, l5].map(line => line.slice(0, process.stdout.columns));

  console.clear();
  blinkLoadingText('Loading...').then(() => {
    console.clear();
    console.log(chalk.cyan(intro.join('\n')));
    console.log(chalk.cyan('Awaiting events...'));
  });
};

const log = type => message => {
  const now = Date.now();
  const dtg = Intl.DateTimeFormat('en-US', options).format(now);
  const messageStr = typeof message === 'string'
    ? message
    : (message instanceof Buffer && message.toString()) || JSON.stringify(message);

  logStream.write([type, dtg, messageStr].join('\n'));
};

const title = () => {
  const ln2 = '            _                 _                               _     ';
  const ln1 = '           | |               | |                             (_)    ';
  const l0 = '  _ __ ___ | |_    __ _  __ _| |_ _____      ____ _ _   _     _ ___ ';
  const l1 = ' | \'_ ` _ \\| __|  / _` |/ _` | __/ _ \\ \\ /\\ / / _` | | | |   | / __|';
  const l2 = ' | | | | | | |_  | (_| | (_| | ||  __/\\ V  V / (_| | |_| |   | \\__ \\';
  const l3 = ' |_| |_| |_|\\__|  \\__, |\\__,_|\\__\\___| \\_/\\_/ \\__,_|\\__, |   | |___/';
  const l4 = '                   __/ |                             __/ |  _/ |    ';
  const l5 = '                  |___/                             |___/  |__/    ';

  const intro = [ln2, ln1, l0, l1, l2, l3, l4, l5].map(line => line.slice(0, process.stdout.columns));

  console.clear();
  console.log(chalk.cyan(intro.join('\n')));
  // console.log(chalk.cyan('Awaiting events...'));
};

const logFailure = () => {
  title();
  console.log(chalk.red('You are missing one or both of the required connection props "gatewayToken" and "host".'));
  console.log(chalk.red('Check in ./connect/connection.json and make sure you\'ve entered them correctly.'));
  process.exit(0);
}

module.exports = {
  title,
  log,
  logFailure,
};
