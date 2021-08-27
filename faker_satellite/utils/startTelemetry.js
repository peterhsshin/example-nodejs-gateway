const startTelemetry = ({ sendFn, dest, systemName }) => {
  const telemetry = {
    battery: {
      voltage: {
        value: 3.9,
        step: 0.01,
        max: 4.2,
        min: 3,
      },
      temperature: {
        value: 20,
        step: 0.1,
        max: 35,
        min: 5,
      },
    },
    panels: {
      temperature_x: {
        value: 25,
        step: 0.1,
        max: 35,
        min: 20,
      },
      temperature_y: {
        value: 25.5,
        step: 0.1,
        max: 35,
        min: 20,
      },
      temperature_z: {
        value: 24.5,
        step: 0.1,
        max: 35,
        min: 20,
      },
    },
  };

  const generate = () => {
    const measurements = [];

    Object.entries(telemetry).forEach(([subsystem, metricObj]) => {
      Object.entries(metricObj).forEach(([metric, { step, max, min, value }]) => {
        if (value >= max) {
          telemetry[subsystem][metric].value = value - step;
        } else if (value <= min) {
          telemetry[subsystem][metric].value = value + step;
        } else {
          telemetry[subsystem][metric].value = value + (step * (Math.random() > 0.5 ? 1 : -1));
        }

        if (sendFn()) {
          measurements.push({
            system: systemName,
            subsystem,
            metric,
            value,
            timestamp: Date.now(),
          });
        }
      });
    });

    if (sendFn()) {
      dest.send(JSON.stringify({
        type: 'measurements',
        measurements,
      }));
    }
  };

  const safe = () => {
    clearInterval(telemInterval);
    setTimeout(() => {
      telemInterval = setInterval(generate, 1000);
    }, 1000 * 60 * 3);
  };

  let telemInterval = setInterval(generate, 1000);

  return { safe };
};

module.exports = startTelemetry;
