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
- REST API

## 📂 Project Structure

```bash
src/
├── common/ # Shared utilities, decorators, filters, guards, pipes, and interfaces used across modules
├── lib/ # Reusable libraries or helpers (e.g., logger, JWT utils, password hashing)
├── modules/ # Feature-specific modules (e.g., auth, users, roles)
├── prisma/ # Prisma schema, migrations, and generated client
├── app.controller.ts # Root application controller (optional, can handle basic health checks or default routes)
├── app.module.ts # Root application module, imports feature modules and configures providers
├── app.service.ts # Root application service, typically contains shared logic for the app
├── main.ts # Application entry point, bootstrap NestJS server
env # Environment variable configuration file
```

## 🛠️ Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Set up .env**

Create a .env file in the root directory and configure your environment variables:

```bash
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=your_desired_port_number
```

3. **Run migrations**

```bash
npx prisma migrate dev --name init --schema=./src/prisma/schema.prisma
```

4. **Start the server**

```bash
pnpm run dev
```

## 📖 Features

- Modular NestJS architecture (controllers, modules, services, guards)
- JWT authentication with access + refresh tokens and DB persistence
- Secure logout with refresh token invalidation / blacklist
- Role-based access control with permission overrides and organizational unit checks
- User registration with GivenName and Surname normalization
- Admin-managed password reset and must-change-password enforcement
- Audit logging for all critical operations
- Input validation using Zod
- Permission caching for performance
- Centralized error handling via NestJS exception filters
- Historical password storage (PasswordHistory)
- Operation logs for compliance and traceability

## 🧪 Tests

1. **Run tests**

```bash
pnpm test
```

## 📘 License

MIT
