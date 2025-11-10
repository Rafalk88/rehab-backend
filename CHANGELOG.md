# `Changelog.md`

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.6.0] - 2025-11-10

### Added

- **Encryption feature**
  - `AuthService.loginUser` now encrypts sensitive data.
  - Improves overall authentication security.
- **Support for Prisma 6.13**
  - Migrated all Prisma imports to `generated/prisma/client.js`.
  - Updated `PrismaService` to extend new PrismaClient with proper hooks.
- **Updated DbLoggerService types**
  - Improved JSON type handling for `oldValues` and `newValues` in audit logs.

### Changed

- Refactored tests to support Prisma 6.13 and updated DbLoggerService typings.
- `AuditMiddleware` now works with new Prisma client structure.
- Minor refactors to ensure backward-compatible context handling in `RequestContextService`.

### Fixed

- Resolved TypeScript errors related to JSON fields in audit logs.
- Fixed Jest ESM import issues for Prisma.
- Ensured all middleware and Prisma hooks correctly handle missing or excluded models.

---

## [0.5.1] - 2025-11-03

### Changed

- **Refactored authentication to use request context**
  - `AuthService.loginUser` now automatically retrieves `userId` and `ipAddress` from `RequestContextService` instead of requiring them as arguments.
  - Removes manual IP handling in controllers for cleaner, centralized context management.
- **Simplified controller code**
  - `login` endpoint no longer needs to extract IP manually; the request context middleware provides it automatically.
- **Improved type safety**
  - `RequestContextData` now properly typed and used across services to avoid optional chaining issues when accessing `userId` and `ipAddress`.
- **Internal code cleanup**
  - Removed redundant IP handling in legacy auth methods.
  - Improved readability and maintainability of login flow with centralized context usage.

### Fixed

- Resolved TypeScript error when accessing `ipAddress` from request context (`Property 'ipAddress' does not exist on type 'RequestContextData | undefined'`).

---

## [0.5.0] - 2025-11-01

### Added

- **Automatic Prisma auditing middleware (`AuditMiddleware`)**
  - Automatically logs all `create`, `update`, `delete`, and `upsert` operations.
  - Writes detailed entries to `OperationLog` with old and new record snapshots.
  - Retains logs for 5 years.
- **Request-scoped context handling (`RequestContextService`)**
  - Uses `AsyncLocalStorage` to persist `userId` and `ipAddress` per request.
  - Enables transparent access to request metadata across Prisma and other services.
- **Prisma session middleware (`PrismaSessionMiddleware`)**
  - Automatically extracts `user` and `IP` from each incoming request.
  - Stores request context for use in audit and other Prisma operations.
- **Unit tests**
  - Added comprehensive tests for:
    - `DbLoggerService`
    - `AuditMiddleware`
    - `PrismaSessionMiddleware`
  - Validated Prisma hooks, context propagation, and audit record creation.

### Changed

- **Refactored `DbLoggerService`**
  - Now handles errors gracefully and logs them using NestJS `Logger`.
  - Unified `LogParams` interface for consistent audit metadata.
- **Updated `PrismaModule`**
  - Ensures global availability of Prisma auditing and context services.
- **Improved code clarity**
  - All audit-related comments and documentation are now in English.
  - Code reorganized for better separation between Prisma extensions and middleware.

### Fixed

- Corrected type handling for `userId` (now supports `string | null`).
- Prevented recursive logging of `OperationLog`, `BlacklistedToken`, and `RefreshToken` models.

---

## [0.4.1] - 2025-10-09

### Fixed

- Fixed and stabilized all unit and integration tests across the project.
- Correctly mocked dependencies in guards, services, and other modules.
- Verified server starts correctly and all tests run successfully in CI/CD.

### Changed

- Minor refactoring in tests for readability and maintainability.

---

## [0.4.0] - 2025-09-14

### Added

- Added **refresh token blacklist** to prevent reuse of old refresh tokens.
- Improved **refresh token rotation** to ensure old tokens are invalidated before saving new ones.
- Added explicit type safety for `tokenEntry` in `refreshTokens` and `logoutUser`.
- Updated tests to reflect new behavior of token rotation and blacklist handling.

### Changed

- `AuthService.refreshTokens` now:
  - Checks if the refresh token is already blacklisted.
  - Moves old token to blacklist before deleting from DB.
  - Saves new refresh token after old token removal.
- `AuthService.logoutUser` now:
  - Adds token to blacklist before deletion.
  - Ensures secure logout process with audit logging.
- Minor JSDoc updates and comment clarifications.

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
