const broadcastCarrierSignal = ({ updateFn }) => new Promise((resolve) => {
  const AWAITING_ACK = 'awaiting satellite ack';
  const statusPhases = [
    'checking for sideband traffic',
    'broadcasting callsign and net clear',
    'initiating carrier frequency',
    AWAITING_ACK,
  ];
  const maxWait = 6000;
  const intervalWait = 1000;
  let waited = 0;
  let idx = 0;

  const bcastInt = setInterval(() => {
    if (waited >= maxWait) {
      clearInterval(bcastInt);
      updateFn(100, 'awaiting satellite ack');
      resolve();
    } else {
      updateFn((idx + 1) * 10, statusPhases[idx] || AWAITING_ACK);
      idx += 1;
      waited += intervalWait;
    }
  }, intervalWait);
});

module.exports = broadcastCarrierSignal;
