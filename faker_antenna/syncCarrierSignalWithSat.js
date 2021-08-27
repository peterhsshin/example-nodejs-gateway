const syncCarrierSignalWithSat = ({ updateFn, satellite }) => new Promise((resolve, reject) => {
  const maxAttempts = 10;
  const checksumWords = [
    'ALBUM',
    'BANTU',
    'COMET',
    'DOETH',
    'EARTH',
    'FORCE',
    'GALAX',
    'HEXAD',
    'INGOT',
    'JUMBO',
  ];
  let didReceiveAck = false;
  let attempts = 0;
  let pingInterval;
  let checkWord;

  const carrierPingListener = ({ type, word }) => {
    if (!didReceiveAck) {
      updateFn('acked_by_system');
      didReceiveAck = true;
    }

    if (type === 'checksum_pong') {
      updateFn('downlinking_from_system', attempts, maxAttempts);

      if (word === checkWord) {
        clearInterval(pingInterval);
        satellite.off('message', carrierPingListener);
        resolve(`${word}${checkWord}`);
      }
    }
  };

  updateFn('uplinking_to_system');
  checkWord = checksumWords[attempts];
  attempts += 1;
  satellite.on('message', carrierPingListener);
  satellite.send({ type: 'checksum_ping', word: checkWord });
  updateFn('transmitted_to_system');

  pingInterval = setInterval(() => {
    if (attempts >= maxAttempts) {
      clearInterval(pingInterval);
      satellite.off('message', carrierPingListener);

      reject(new Error(
        didReceiveAck
          ? 'Contact made with satellite but could not sync carriers'
          : `No contact with satellite after ${maxAttempts} seconds`
      ));
    } else {
      checkWord = checksumWords[attempts];
      attempts += 1;
      satellite.send({ type: 'checksum_ping', word: checkWord });
    }
  }, 1000);
});

module.exports = syncCarrierSignalWithSat;
