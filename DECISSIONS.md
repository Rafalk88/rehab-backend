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
