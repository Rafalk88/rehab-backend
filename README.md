# Rehab Backend

⚠️ **Project Status: Integration in Progress**  
The backend is currently being migrated to **NestJS**.  
At this stage, the codebase is **unstable and not fully functional**.  
Do not use in production until the migration is completed and stabilized.

This repository contains the backend of the Rehabilitation Management System.

## 🚀 Tech Stack

- Node.js
- TypeScript
- NestJS (built on top of Express)
- Prisma ORM
- PostgreSQL
- JWT for authentication and session management
- Zod for input validation
- Husky
- Winston
- REST API

## 📂 Project Structure

```bash
src/
├── __mocks__/ # Mocks for testing purposes
├── config/ # Configuration (e.g. environment, Prisma client)
├── errors/ # Handle global errors in app
├── middlewares/ # Global and route-specific middlewares (authentication, authorization, validation, error handling)
├── prisma/ # Prisma schema and migrations
├── services/ # Service layer (e.g. authService)
├── utils/ # Reusable utilities and classes (AppError, JWT utils, cache utils)
├── app.ts # Express app setup
├── index.ts # Server listener
env # env variables
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

- Modular architecture with NestJS (dependency injection, modules, guards, interceptors)
- User authentication & authorization (JWT-based)
- Role-based access control with permission overrides and organizational unit checks
- User registration with GivenName and Surname deduplication
- Password reset and change system (admin-managed)
- Audit logging for compliance and traceability
- Input validation using Zod schemas
- Permission caching for improved performance
- Centralized error handling (via NestJS exception filters)
- Organizational unit and role management
- Historical password storage (PasswordHistory)

## 🧪 Tests

1. **Run tests**

```bash
pnpm test
```

## 📘 License

MIT
