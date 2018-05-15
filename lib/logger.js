const winston = require('winston');
const { simple, colorize, combine } = winston.format;

const logger = winston.createLogger({
  level: 'debug',
  format: combine(
    colorize(),
    simple()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = logger;
