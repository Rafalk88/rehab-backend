# Rehab Backend

⚡ **Project Status: Active Development**
The codebase represents the current, stable architecture for the Rehabilitation Management System.

## 🚀 Tech Stack

- Node.js
- TypeScript
- NestJS (modular, dependency-injection-based architecture)
- Prisma ORM
- PostgreSQL
- JWT for authentication (access + refresh tokens)
- Zod for input validation
- Husky (pre-commit hooks)
- Winston (structured logging)
- cross-env (cross-platform environment variables)
- REST API

## 📂 Project Structure

```bash
src/
├── common/       # Shared utilities, filters, guards, pipes, errors
├── context/      # RequestContextService — AsyncLocalStorage per request
├── lib/          # Reusable helpers (encryption, password, logger, DbLoggerService)
├── modules/      # Feature modules (auth, patients, visits, permissions, permissions-admin)
├── prisma/       # Prisma schema, migrations, extensions, middleware
├── seed/         # Database seed scripts
├── tests/        # Shared test helpers and mocks
├── types/        # Shared TypeScript types
├── app.module.ts
├── app.controller.ts
└── main.ts
```

## 🛠️ Setup

1. **Set up .env**

```bash
cp .env.example .env
```

Then fill in your values:

```bash
NODE_ENV="development" | "production"
FRONTEND_URL=your_frontend_url
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PORT=3001
DB_HMAC_KEY_V1=your_hmac_key_hex
DB_ENCRYPTION_KEY_V1=your_encryption_key_hex
```

2. **Run full local setup**

```bash
pnpm setup:local
```

This will automatically:

- Start Docker (PostgreSQL)
- Install dependencies
- Generate Prisma client
- Run migrations
- Build the project
- Seed the database

3. **Start the server**

```bash
pnpm start:dev  # watch mode
pnpm start      # production mode
```

## 📖 Features

- Modular NestJS architecture (controllers, modules, services, guards)
- JWT authentication with access + refresh tokens and DB persistence
- Secure logout with refresh token blacklist
- Role-based access control (RBAC) with per-user permission overrides
- Organizational unit context for fine-grained access control
- Patient module with encrypted PESEL and PeselStatus enum
- AES-256-GCM encryption for sensitive fields with key versioning
- HMAC-based search index for encrypted fields
- Automatic audit logging via Prisma extension for all CRUD operations
- Sensitive field redaction in audit logs (`[REDACTED]`)
- Manual audit triggers for edge cases outside Prisma
- Input validation using Zod schemas
- Permission caching with in-memory store
- Centralized error handling via NestJS exception filters
- GivenName and Surname normalization and deduplication
- Password history tracking (last 5 passwords)
- Admin-managed password reset with mustChangePassword enforcement
- Request context propagation via AsyncLocalStorage
- Structured logging with Winston
- Visit module with status management, date tracking (planned/register/completion), EWUŚ verification flag and billing flag
- PESEL decryption included in visit responses

## 🧪 Tests

```bash
pnpm test          # run all tests
pnpm test:unit     # unit tests only
pnpm test:int      # integration tests only
pnpm test:watch    # watch mode
pnpm test:cov      # with coverage report
```

Current coverage: ~71% overall

## 📘 Documentation

- [DECISIONS.md](./DECISIONS.md) — Architecture and technical decisions
- [DATABASE.md](./DATABASE.md) — Database model overview
- [CHANGELOG.md](./CHANGELOG.md) — Version history

## 📘 License

MIT
