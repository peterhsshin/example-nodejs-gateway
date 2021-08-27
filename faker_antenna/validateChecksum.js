const validateChecksum = ({ updateFn }) => new Promise(resolve => {
  updateFn('calculating checksum');
  setTimeout(() => {
    updateFn('resolved check value');
    resolve(`VALID::${(Math.random() * Date.now()).toFixed(4)}`);
  }, 1500);
});

module.exports = validateChecksum;
