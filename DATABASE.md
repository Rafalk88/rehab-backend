# `Database Model Overview`

This document provides an overview of the database models used in the rehab-backend.

## 👤 User

Main user table. Contains authentication and personal data.

### Fields:

- `id`: UUID, primary key
- `login`, `email`, `password_hash`
- Foreign keys: `first_name_id`, `surname_id`, `organizational_unit_id`, `sex_id`

## 📛 GivenName & Surname

Normalized name tables to reduce redundancy and support reusability.

### Example:

- `GivenName`: "John"
- `Surname`: "Doe"

## 🏢 OrganizationalUnit

Defines units like departments or physical locations.

## ⚧️ Sex

Enum-style table for defining gender (e.g., "Male", "Female", "Other").

## 🔐 Role & UserRole

RBAC model.

- `Role`: defines roles like "Admin", "Doctor"
- `UserRole`: links users to roles with metadata (assigned_by, assigned_at)

## 🔄 PasswordHistory

Tracks all password changes for users.

### Fields:

- `user_id`: The owner of the password
- `changed_by`: Who changed it
- `changed_at`: Timestamp
