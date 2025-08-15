import logger from '@config/logger';
import { AppError } from '@/old code/errors/app.error.js';
import type { NextFunction, Request, Response } from 'express';

/**
 * Globalny middleware do obsługi błędów w aplikacji Express.
 *
 * Zadania:
 * - Loguje szczegóły błędu do pliku i konsoli (korzystając z loggera `winston`).
 * - Zwraca klientowi odpowiednią odpowiedź JSON z komunikatem błędu.
 * - Jeśli błąd jest instancją `AppError`, używa jego komunikatu i statusu HTTP.
 * - W przypadku innych błędów zwraca domyślny kod `500` i ogólny komunikat.
 *
 * @param error Obiekt błędu (np. `AppError` lub natywny `Error`).
 * @param request Obiekt żądania Express.
 * @param response Obiekt odpowiedzi Express.
 * @param _next Funkcja `next` (nieużywana – wymagane przez kontrakt middleware Express).
 */
export const errorHandler = (
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction, // eslint-disable-line no-unused-vars
) => {
  // Loguj szczegóły błędu do pliku + konsoli
  logger.error({
    message: error.message,
    stack: error.stack || 'No stack trace',
    name: error.name,
    method: request.method,
    url: request.originalUrl,
    body: request.body,
    params: request.params,
    query: request.query,
  });

  response.status('statusCode' in error ? (error.statusCode as number) : 500).json({
    message: error instanceof AppError ? error.message : 'Oops! Something went wrong...',
  });
};
