/**
 * Reprezentuje niestandardowy błąd aplikacji z przypisanym kodem HTTP.
 *
 * Umożliwia kategoryzowanie błędów na podstawie ich typu (np. walidacja, brak autoryzacji)
 * oraz automatyczne przypisanie odpowiedniego kodu statusu HTTP.
 *
 * Typ błędu (`type`) jest mapowany na kod HTTP według statycznego obiektu `typeToCode`.
 *
 * Dostępne typy i odpowiadające im kody:
 * - `validation` → 400 (Błąd walidacji danych wejściowych)
 * - `unauthorized` → 401 (Brak uwierzytelnienia)
 * - `forbidden` → 403 (Brak uprawnień)
 * - `server` → 500 (Błąd serwera)
 *
 * @extends Error
 */
class AppError extends Error {
  statusCode = 400;
  static typeToCode = {
    validation: 400,
    unauthorized: 401,
    forbidden: 403,
    server: 500,
  };
  constructor(type: keyof typeof AppError.typeToCode, message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = AppError.typeToCode[type];
    Error.captureStackTrace(this);
  }
}

export { AppError };
