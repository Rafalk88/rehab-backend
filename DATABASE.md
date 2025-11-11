# `Database Model Overview`

This document provides an overview of the database models used in the rehab-backend.

---

## 👤 User

Main user table. Contains authentication, personal data, and relations.

### Fields

- `id`: UUID, primary key
- `login_hmac`, `login_encrypted`, `login_masked`, `email_hmac`, `email_encrypted`, `email_masked`, `password_hash`, `key_version`
- Flags and timestamps: `must_change_password`, `password_changed_at`, `password_changed_by`, `is_active`, `is_locked`, `locked_until`, `failed_login_attempts`, `last_failed_login_at`, `last_login_at`
- Foreign keys: `first_name_id`, `surname_id`, `organizational_unit_id`, `sex_id`
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `retention_until`

### Relations

- `organizationalUnit`: OrganizationalUnit
- `sex`: Sex
- `firstName`: GivenName
- `surname`: Surname
- `userRoles`: list of UserRole
- `assignedRoles`: list of UserRole (assigned by user)
- `userPermissions`: list of UserPermission (explicit allow/deny)
- `passwordOwnerHistory`: PasswordHistory (passwords owned by user)
- `passwordChangerHistory`: PasswordHistory (passwords changed by user)
- `operationLogs`: OperationLog (actions performed by user)
- `refreshTokens`: list of UserRefreshToken (active refresh tokens per user)

---

## 📛 GivenName & Surname

Normalized tables for first names and surnames to reduce redundancy and enable reusability.

### Fields

- `id`: UUID, primary key
- `first_name` / `surname`: unique string
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `retention_until`

### Relations

- linked to multiple Users

---

## 🏢 OrganizationalUnit

Defines organizational units such as departments or locations.

### Fields

- `id`: UUID, primary key
- `name`: unique
- `description`: optional
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `retention_until`

### Relations

- linked to multiple Users

---

## ⚧️ Sex

Defines gender enumeration.

### Fields

- `id`: UUID, primary key
- `sex`: unique string (e.g., "Male", "Female", "Other")
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `retention_until`

### Relations

- linked to multiple Users

---

## 🔐 Role & UserRole

Role-based access control (RBAC) implementation.

### Role

- `id`: UUID, primary key
- `name`: unique role name (e.g., "Admin", "Doctor")
- `description`: text
- Audit fields

### UserRole

- `id`: UUID, primary key
- `user_id`, `role_id`, `assigned_by` (user who assigned the role)
- `assigned_at`: timestamp

### RolePermission

- `id`: UUID, primary key
- `role_id`
- `permission`: string permission name

---

## 🔑 UserPermission

Explicit permission overrides per user.

### Fields

- `id`: UUID, primary key
- `user_id`
- `permission`: string
- `allowed`: boolean (true = allow, false = deny)

---

## 🔄 PasswordHistory

Tracks password changes over time.

### Fields

- `id`: UUID, primary key
- `user_id`: owner of the password
- `password_hash`
- `changed_at`: timestamp
- `changed_by`: user who changed the password

---

## 📝 OperationLog

Audit logging of user actions.

### Fields

- `id`: UUID, primary key
- `user_id`: user who performed the action
- `action`: string describing the action
- `action_details`: detailed description
- `old_values`: JSON object with old data (nullable)
- `new_values`: JSON object with new data (nullable)
- `timestamp`: action time
- `entity_type`: string (affected entity)
- `entity_id`: string (affected entity id)
- `ip_address`: string (source IP)

---

## 🔑 UserRefreshToken

Stores refresh tokens per user for session management.

### Fields

- `id`: UUID, primary key
- `user_id`: foreign key to User
- `token`: hashed refresh token
- `ip_address`: string (where the token was issued)
- `user_agent`: string (optional, browser/device info)
- `expires_at`: DateTime (when token becomes invalid)
- `revoked_at`: DateTime? (null if active, otherwise timestamp of revocation)
- Audit fields: `created_at`, `updated_at`

### Relations

- Belongs to one User

---

## 🚫 BlacklistedToken (optional, if implemented)

Stores invalidated access tokens for early rejection before expiry.

### Fields

- `id`: UUID, primary key
- `token`: hashed access token
- `user_id`: foreign key to User
- `revoked_at`: DateTime
- `reason`: string (e.g., "logout", "compromised")
- `ip_address`: string (source IP)

---
