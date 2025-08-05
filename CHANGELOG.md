# `Changelog.md`

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

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
