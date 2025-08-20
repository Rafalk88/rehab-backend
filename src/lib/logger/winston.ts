import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors, colorize } = winston.format;

// Log form: time, level, message, stack trace
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // keep logs 14 days
  zippedArchive: true,
  maxSize: '20m',
});

const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    transport,
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
  exitOnError: false,
});

winstonLogger.info('Logger initialized');

export default winstonLogger;
