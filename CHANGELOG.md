# `Changelog.md`

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.3.0] - 2025-09-14

### Added
- Migrated backend framework from Express to **NestJS** with modular architecture.
- Implemented **JWT authentication with Access & Refresh tokens**:
  - Access tokens are short-lived (15m), refresh tokens are persisted in DB.
  - Added rotation mechanism for refresh tokens.
  - Added `UserRefreshToken` table in DB schema.
- Implemented **logout logic** with DB-managed token revocation (no Redis dependency).
- Extended **DbLoggerService** to log authentication events (`login`, `logout`, `login_failed`).
- Added **Winston logger** integration as centralized logging layer.
- Added **HttpExceptionFilter** for consistent error responses and error logging.
- Extended **DECISIONS.md** with decision on JWT persistence in DB.

### Changed
- Updated `User` model relations to include `refreshTokens`.
- Refactored `AuthService`:
  - `loginUser` now generates both `access_token` and `refresh_token`.
  - `logoutUser` revokes refresh token in DB.
- Restructured project into NestJS modules for better maintainability.

---

## [0.2.0] - 2025-08-10

### Added

- Middleware `authentication` to verify JWT tokens and set user session info.
- Middleware `authorization` to enforce permission-based access control with support for:
  - Role-based permissions fetched from database and cached in-memory with TTL.
  - User-specific permission overrides with explicit allow/deny logic.
  - Optional organizational unit matching for fine-grained access restrictions.
- In-memory permission caching system (`permCache`) to reduce database queries and improve performance.
- Centralized error handling middleware returning standardized JSON error responses.
- Request validation middleware based on Zod schemas, validating request body, query, and params with detailed error reporting.

### Changed

- Refactored authentication and authorization to separate concerns and improve security/maintainability.
- Introduced caching strategy to optimize permission loading, preventing excessive database access.
- Enhanced error propagation using custom `AppError` for clearer API error semantics.

## [0.1.0] - 2025-08-05

### Added

- Initial project setup with Express, Prisma, PostgreSQL
- User model and registration system
- GivenName and Surname deduplication logic
- Role management and assignment (via UserRole)
- Authentication with JWT
- Password history tracking
- OperationLog for audit logging

### Changed

- Switched to UUIDs for all models
