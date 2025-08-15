import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors, colorize } = winston.format;

// Format logów, który pokazuje czas, poziom i komunikat oraz stack błędu jeśli jest
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // zachowuj logi z ostatnich 14 dni
  zippedArchive: true, // kompresuj starsze pliki
  maxSize: '20m', // maksymalny rozmiar pliku 20MB
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // obsługa stack trace błędów
    logFormat,
  ),
  transports: [
    transport,
    new winston.transports.Console({
      format: combine(colorize(), logFormat), // kolorowa konsola w devie
    }),
  ],
  exitOnError: false,
});

logger.info('Logger initialized');

export default logger;
