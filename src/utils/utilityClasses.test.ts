import { AppError } from './utilityClasses';

describe('utilityClasses', () => {
  describe('AppError', () => {
    it('should set the status code based on the type of error', () => {
      const error1 = new AppError('validation', 'validationError');
      const error2 = new AppError('unauthorized', 'authError');
      const error3 = new AppError('server', 'serverError');
      expect(error1.statusCode).toBe(400);
      expect(error2.statusCode).toBe(401);
      expect(error3.statusCode).toBe(500);
    });

    it('should set the error message', () => {
      const error = new AppError('validation', 'validation-error');
      expect(error.message).toBe('validation-error');
    });
  });
});
