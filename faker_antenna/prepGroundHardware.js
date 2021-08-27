/**
 * @callback UpdateFunction
 * @param {Number} percentComplete The percentage of the task that is completed
 * @param {String} phaseLabel A string identifying the phase of the task
 * @returns
 */

/**
 *
 * @param {Object} param0 params
 * @param {UpdateFunction} param0.updateFn Will be called as the task updates
 * @returns {Promise}
 */
const prepGroundHardware = ({ updateFn }) => new Promise((resolve, reject) => {
  const statusPhases = [
    'actuator power cycle',
    'gimballing hardware',
    'hardware clearance check',
    'radio power cycle',
    'digesting tle',
    'computing pass angles',
    'translating pass trajectory',
    'calibrating radio oscillator',
    'refining radio frequency',
    'finishing pass prep',
  ];
  let i = 0;

  const calcInterval = setInterval(() => {
    if (i >= statusPhases.length) {
      clearInterval(calcInterval);
      updateFn(100, 'done');
      resolve();
    } else {
      updateFn(Math.floor((i / (statusPhases.length - 1)) * 100) , statusPhases[i]);
      i += 1;
    }
  }, 1700);
});

module.exports = prepGroundHardware;
