### `DECISIONS.md`

# Architecture & Technical Decisions

This document outlines key design and architecture decisions for the rehab-backend.

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
  Cached role permissions with TTL to reduce DB queries.
  Permission overrides loaded fresh per request to respect explicit allow/deny rules.
  Optional organizational unit context checks for fine-grained access control.
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

## Decision 007 - API Versioning Strategy

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
