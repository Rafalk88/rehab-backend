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
