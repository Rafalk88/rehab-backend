import { createLogger, format, transports, addColors } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors, colorize } = format;

const customColors = {
  info: 'green',
  warn: 'yellow',
  error: 'red',
  debug: 'blue',
  verbose: 'cyan',
};

addColors(customColors);

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transport = new transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // keep logs 14 days
  zippedArchive: true,
  maxSize: '20m',
});

const winstonLogger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    transport,
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
  exitOnError: false,
});

winstonLogger.info('Logger initialized');

export default winstonLogger;
