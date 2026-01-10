# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

Keep this updated as the codebase evolves.

## Project Overview

FitFinder helps employers judge candidate fit by comparing uploaded resumes against job descriptions, scoring them, and drafting interview questions with Gemini.

## What to Know

- Product pillars: resume upload, AI-driven match scoring (0-100), concise justification, and auto-generated interview prompts per job.
- Architecture: TanStack Start + React UI, server functions for data/AI work, Prisma + Postgres for multi-tenant storage, Vite build.
- Data model (high level): users, organizations, memberships with admin flag, jobs under organizations, resumes tied to both job and user and storing AI outputs.
- AI loop: extract text from PDF, send to Gemini with job context, persist score/justification/questions on the resume record.
- Auth/session: email-password with PBKDF2, session via encrypted cookies, routes gate on presence of a user in context.
- Client data flow: TanStack Query with tRPC for mutations/queries; router wires SSR and query client.

## Working in the Repo

- Install and run: `pnpm install`, `pnpm dev`; build/preview with `pnpm build` and `pnpm preview`; start prod server with `pnpm start`.
- Database: Prisma schema lives in `prisma/schema.prisma`; client output in `src/prisma-generated/`; migrations under `prisma/migrations/`. Common tasks: generate client, create/apply migrations, open Prisma Studio.
- Key entry points: router setup in `src/router.tsx`; Prisma/session helpers in `src/utils/`; main routes and server functions under `src/routes/` (notably apply flow and organization/job/candidate views).
- Paths: TypeScript alias `~/` points to `src/`.

## Behavior Expectations

- Favor type-safe imports from `src/prisma-generated/browser` in UI code; avoid `any`.
- Keep tenant boundaries: operations scoped by organization; admin flag controls job and admin creation.
- AI outputs are stored on resumes and surfaced in candidate views.
