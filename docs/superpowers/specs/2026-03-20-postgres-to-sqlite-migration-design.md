# PostgreSQL to SQLite Migration Design

## Overview
Switch the database provider from PostgreSQL to SQLite for simplified local development. No production data needs to be preserved.

## Changes

### 1. Prisma Schema (`prisma/schema.prisma`)
- Change `provider = "postgresql"` to `provider = "sqlite"`
- Remove all `@db.*` annotations (VarChar, Text, Timestamptz)
- Replace enum types with String (enums handled at application level)

### 2. Environment Config
- `.env`: Update `DATABASE_URL` to SQLite format
- `.env.local.example`: Sync the change

### 3. Data Flow
- No changes to API layer or business logic
- Prisma Client automatically adapts queries for SQLite

## Enum Mapping
| PostgreSQL Enum | SQLite String |
|-----------------|---------------|
| OrganizationType | `company`, `department`, `team` |
| Visibility | `company`, `department`, `personal` |
| SourceType | `url`, `local_path` |

## Implementation Steps
1. Update `prisma/schema.prisma`
2. Update `.env` and `.env.local.example`
3. Run `prisma generate` + `prisma db push`
4. Verify seed data works
