const getRandomInt = require("./utils/getRandomInt");

const orientAntenna = ({ updateFn }) => new Promise((resolve) => {
  const totalToRotate = getRandomInt(0, 268);
  let done = 0;

  const rotInterval = setInterval(() => {
    if (done >= totalToRotate) {
      clearInterval(rotInterval);
      updateFn(totalToRotate, 0);
      resolve();
    } else {
      done += 3;
      updateFn(done, totalToRotate - done);
    }
  }, 200);
});

module.exports = orientAntenna;
