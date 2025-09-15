### `DECISIONS.md`

# Architecture & Technical Decisions

This document outlines key design and architecture decisions for the rehab-backend.

---

## Table of Contents

- [Decision 012 - JWT Access & Refresh Tokens with Database Persistence](#decision-012---jwt-access--refresh-tokens-with-database-persistence)
- [Decision 011 - NestJS as Backend Framework](#decision-011---nestjs-as-backend-framework)
- [Decision 010 - API Versioning Strategy](#decision-010---api-versioning-strategy)
- [Decision 009 - Use JSDoc for API and code documentation](#decision-009---use-jsdoc-for-api-and-code-documentation)
- [Decision 008 - Pre-commit hooks with Husky](#decision-008---pre-commit-hooks-with-husky)
- [Decision 007 - Logging with Winston](#decision-007---logging-with-winston)
- [Decision 006 - Validation using Zod schemas](#decision-006---validation-using-zod-schemas)
- [Decision 005 - Authentication and Authorization Middleware with Caching](#decision-005---authentication-and-authorization-middleware-with-caching)
- [Decision 004 - Audit Logging](#decision-004---audit-logging)
- [Decision 003 - Password change logic controlled by admin](#decision-003---password-change-logic-controlled-by-admin)
- [Decision 002 - GivenName and Surname as separate tables](#decision-002---givenname-and-surname-as-separate-tables)
- [Decision 001 - UUIDs for all primary keys](#decision-001---uuids-for-all-primary-keys)

---

## Decision 001 - UUIDs for all primary keys
- **Date**: 2025-08-05  
- **Status**: Accepted  
- **Context**: System needs global uniqueness and is expected to work in a distributed context.  
- **Decision**: All primary keys are UUIDs.  

## Decision 002 - GivenName and Surname as separate tables
- **Date**: 2025-08-05  
- **Status**: Accepted  
- **Context**: Names are reused across multiple users (patients, application users).  
- **Decision**: Normalize first names and surnames into separate tables to avoid duplication and allow reusability.  

## Decision 003 - Password change logic controlled by admin
- **Date**: 2025-08-05  
- **Status**: Accepted  
- **Context**: Security policies require that users do not change their own password unless explicitly allowed.  
- **Decision**: Users cannot change their own password; admins reset it and require users to set a new one on next login.  

## Decision 004 - Audit Logging
- **Date**: 2025-08-05  
- **Status**: Accepted  
- **Context**: Compliance with medical system audit standards (e.g., HIPAA, RODO).  
- **Decision**: Every meaningful operation (user registration, login, modification) is logged.  

## Decision 005 - Authentication and Authorization Middleware with Caching
- **Date**: 2025-08-10  
- **Status**: Accepted  
- **Context**: Secure and efficient user identity verification and permission checks are required to protect API endpoints and reduce DB load.  
- **Decision**:  
  Implement `authentication` middleware to verify JWT tokens, parse user ID, and attach session info to requests.  
  Implement `authorization` middleware to verify user permissions using:  
  - Cached role permissions with TTL to reduce DB queries.  
  - Permission overrides loaded fresh per request to respect explicit allow/deny rules.  
  - Optional organizational unit context checks for fine-grained access control.  
  Use a simple in-memory cache (`Map`) with expiration to store role permissions keyed by userId.  
  Fail fast on missing/invalid tokens or insufficient permissions by calling `next()` with an `AppError`.  
  Maintain clear error handling middleware to standardize API error responses.  
- **Rationale**:  
  Separating authentication and authorization concerns improves maintainability and security.  
  Caching role permissions reduces DB roundtrips, improving performance under load.  
  Explicit overrides allow flexible permission customization per user.  
  Organizational unit matching ensures compliance with domain-specific access policies.  

## Decision 006 - Validation using Zod schemas
- **Date**: 2025-08-10  
- **Status**: Accepted  
- **Context**: Input validation is essential to ensure data integrity and prevent malformed requests from reaching business logic or DB.  
- **Decision**:  
  Use Zod for schema definitions and runtime validation of request bodies, query parameters, and route params.  
  Centralize validation in reusable middleware that formats validation errors as standardized `AppError` responses.  
- **Rationale**:  
  Zod provides strong typings and detailed error reports.  
  Centralizing validation reduces duplicated code and improves API robustness.  

## Decision 007 - Logging with Winston
- **Date**: 2025-08-11  
- **Status**: Accepted  
- **Context**: Robust and configurable logging is needed for debugging, monitoring, and compliance with audit requirements.  
- **Decision**: Use Winston as the logging framework to provide structured, leveled logs supporting multiple transports (console, files).  
- **Rationale**: Winston is flexible, widely adopted, and integrates well with Node.js apps, enabling better observability and error tracking.  

## Decision 008 - Pre-commit hooks with Husky
- **Date**: 2025-08-11  
- **Status**: Accepted  
- **Context**: Enforcing code quality and consistent commit messages before pushing code to the repo.  
- **Decision**: Use Husky to run pre-commit hooks for linting, tests, and commit message validation.  
- **Rationale**: Automated hooks reduce human error, ensure higher code quality, and streamline the development workflow.  

## Decision 009 - Use JSDoc for API and code documentation
- **Date**: 2025-08-11  
- **Status**: Accepted  
- **Context**: Clear and maintainable codebase requires inline documentation and auto-generated docs.  
- **Decision**: Adopt JSDoc to document functions, types, and APIs, enabling generation of documentation and improving developer understanding.  
- **Rationale**: JSDoc is a well-known standard that integrates well with editors and tools, enhancing developer experience and onboarding.  

## Decision 010 - API Versioning Strategy
- **Date**: 2025-08-11  
- **Status**: Accepted  
- **Context**: The API is expected to evolve over time with breaking changes and new features. Clients require stability and backward compatibility.  
- **Decision**:  
  We adopt **URI path versioning**, exposing versions as part of the API route (e.g., `/api/v1/...`).  
  This approach is explicit, easy to implement, and simple for clients and developers to understand.  
  Each major API version will be maintained separately in the codebase, allowing simultaneous support.  
  Minor and patch changes within a version are backward compatible and do not require version bumping.  
  Deprecation of older versions will be communicated clearly, with a grace period for clients to migrate.  
- **Rationale**:  
  - Clear visibility of API version for all requests.  
  - Simplifies routing and middleware logic.  
  - Enables simultaneous support for multiple API versions.  
  - Well-known and widely adopted pattern.  

## Decision 011 - NestJS as Backend Framework
- **Date**: 2025-08-15  
- **Status**: Accepted  
- **Context**: The project requires a structured, maintainable, and scalable backend framework that supports modular architecture, dependency injection, and strong TypeScript integration. Express was considered too unopinionated, requiring more manual setup for common features like dependency injection, guards, interceptors, and decorators.  
- **Decision**:  
  Adopt **NestJS** as the main backend framework for the application.  
  - Provides opinionated but flexible architecture following SOLID principles.  
  - Built-in dependency injection system promotes testability and loose coupling.  
  - Decorators and modules improve readability and organization of features.  
  - Strong TypeScript support ensures type safety and better developer experience.  
  - Rich ecosystem of integrations (e.g., with GraphQL, WebSockets, microservices, Prisma, etc.).  
  - Compatible with existing Express middleware and ecosystem, enabling gradual migration and reuse.  
- **Rationale**:  
  - Improves maintainability of a growing codebase by enforcing a consistent project structure.  
  - Enhances productivity with out-of-the-box solutions for common concerns (validation, guards, interceptors).  
  - Provides flexibility to scale into microservices if needed in the future.  
  - Widely adopted and actively maintained, reducing long-term risk.  

## Decision 012 - JWT Access & Refresh Tokens with Database Persistence

- **Date**: 2025-09-14  
- **Status**: Accepted  
- **Context**:  
  The system requires secure and scalable session management. Short-lived JWT access tokens alone were not sufficient, as there was no mechanism for session refresh or token invalidation during logout. Since Redis is not used in this project, all logic must be implemented with the database (Prisma + Postgres).  
- **Decision**:  
  - **Access Token** – short-lived (e.g., 15 minutes), passed in the `Authorization: Bearer` header.  
  - **Refresh Token** – long-lived (e.g., 7 days), stored in the database in the `UserRefreshToken` table, linked to the user and device/IP.  
  - **Refresh Token Rotation** – every refresh generates a new token and deletes the old one.  
  - **Logout** – the refresh token is removed from the database or marked as invalidated (blacklist).  
  - **Audit Logging** – all login/logout operations are recorded through the `DbLoggingService`.  
  - **No Redis** – instead of an in-memory blacklist, refresh tokens are persisted and managed only in the database, ensuring durability and simpler infrastructure.  
- **Rationale**:  
  - Provides secure session management and token invalidation.  
  - Complies with audit requirements (HIPAA/GDPR).  
  - Reduces infrastructure complexity by avoiding Redis.  
  - Database-stored refresh tokens make it easy to monitor and limit sessions across multiple devices.  