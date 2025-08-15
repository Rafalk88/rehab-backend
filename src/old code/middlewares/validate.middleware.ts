import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodObject } from 'zod';
import { AppError } from '@errors/app.error';

/**
 * Middleware walidujący dane wejściowe przy użyciu schematu Zod.
 *
 * - Sprawdza `req.body`, `req.query` i `req.params` według podanego schematu.
 * - W przypadku błędów walidacji zgłasza `AppError` z kodem 400 i listą niepoprawnych pól.
 *
 * @param schema Schemat walidacyjny Zod.
 */
export const validate =
  (schema: ZodObject<any>) => async (req: Request, _: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalids = error.issues.map((issue) => issue.path.pop());
        next(
          new AppError(
            'validation',
            `Invalid or missing input${
              invalids.length > 1 ? 's' : ''
            } provided for: ${invalids.join(', ')}`,
          ),
        );
      } else {
        next(new AppError('validation', 'Invalid input'));
      }
    }
  };
