# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

Keep this updated as the codebase evolves.

## Project Overview

FitFinder is a resume screening application that helps employers analyze candidate-job fit using AI. It allows users to upload resume PDFs, compare them against job descriptions, get match scores (0-100), and automatically generate interview questions using Google's Gemini AI.

## Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server (runs on port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm start
```

### Database

```bash
# Generate Prisma client (outputs to src/prisma-generated/)
pnpm prisma-generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations to database
npx prisma migrate deploy

# Open Prisma Studio to view/edit data
npx prisma studio
```

### Database Schema

Multi-tenant structure with Organizations:

- `User`: Email/password authentication
- `Organization`: Company/team that has jobs and resumes
- `OrganizationUser`: Junction table with isAdmin flag for permissions
- `Job`: Job postings owned by organizations
- `Resume`: Uploaded resumes with AI-generated score, scoreJustification, and questions (JSON)

**Key relationships:**

- Users can belong to multiple organizations
- Resumes are linked to both Users and Jobs
- Only organization admins can create jobs and add other admins

### Server Functions (API Layer)

Server functions are defined with `.fn.tsx` files in route directories:

- **`src/routes/_authed/apply.fn.tsx`**: Resume upload and AI analysis
  - `applyResumeFn`: Processes PDF, extracts text with `pdf-parse`, calls Gemini API
  - `listJobsFn`: Fetches all jobs with organizations
  - Uses Zod schemas for structured AI output validation

- **`src/routes/_authed/organizations.fn.tsx`**: Organization management
  - `createOrganizationFn`: Creates org with creator as admin
  - `listOrganizationsFn`: Lists orgs user is a member of
  - `addAdminFn`: Adds admins (requires existing admin permission)
  - `createJobFn`: Creates jobs in organizations (admin only)

### AI Integration

Resume analysis flow:

1. User uploads PDF resume and selects a job
2. Server extracts text from PDF using `pdf-parse`
3. Text sent to Gemini with job description
4. Gemini returns structured JSON with:
   - `score` (0-100)
   - `scoreJustification` (2-3 sentence explanation)
   - `questions` (array of 5 interview questions with optional topic/confidence)
5. Results stored in Resume record and returned to client

**AI implementation details:**

- Uses `gemini-flash-lite-latest` model
- Structured output via `responseJsonSchema` with Zod validation
- Schema conversion: `zod-to-json-schema` package

### Authentication & Sessions

- Password hashing: PBKDF2 with configurable salt (100,000 iterations, SHA-256)
- Sessions: TanStack Start's `useSession()` with encrypted cookies
- Session stores only user email
- Root route fetches full user object from email on every request
- Protected routes check `context.user` in `beforeLoad` hooks

### State Management

Uses TanStack Query for all server state:

- Server functions wrapped with `useServerFn()` hook
- Queries use `useQuery()` with query keys like `["jobs"]`, `["organization", orgId]`
- Mutations use `useMutation()` for writes (create org, upload resume, etc.)
- Query client configured in router with SSR integration

## Key Files

- `src/router.tsx`: Router configuration with QueryClient and SSR setup
- `src/utils/prisma.ts`: Prisma client singleton and password hashing utility
- `src/utils/session.ts`: Session helper with type-safe user data
- `prisma/schema.prisma`: Database schema (generates to `src/prisma-generated/`)
- `vite.config.ts`: Vite config with TanStack Start, Nitro, and path aliases

## Path Aliases

TypeScript paths configured in `tsconfig.json`:

- `~/` maps to `src/` directory (e.g., `~/utils/prisma` → `src/utils/prisma`)
