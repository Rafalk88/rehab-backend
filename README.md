# Rehab Backend

This repository contains the backend of the Rehabilitation Management System.

## 🚀 Tech Stack

- Node.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Express.js
- JWT for authentication
- REST API

## 📂 Project Structure

```bash
src/
├── config/ # Configuration (e.g. environment, Prisma client)
├── middlewares/ # Global and route-specific middlewares
├── prisma/ # Prisma schema and migrations
├── services/ # Service layer (e.g. authService)
├── utils/ # Reusable utilities
├── app.ts # Express app setup
└── index.ts # Server listener
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
DATABASE_URL=
JWT_SECRET=
PORT=
```

3. **Run migrations**

```bash
npx prisma migrate dev --name init
```

4. **Start the server**

```bash
pnpm run dev
```

## 📖 Features

User authentication & authorization (JWT-based)
Role-based access control
User registration with name deduplication
Password reset and change system (admin-managed)
Audit logging
Organizational unit and role management
Historical password storage (PasswordHistory)

## 📘 License

MIT
