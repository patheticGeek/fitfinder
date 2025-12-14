# FitFinder

FitFinder helps you screen resumes, score candidate-job fit, and automatically generate short interview questions based on the candidate's resume and a job description.

## Getting Started

From your terminal:

```sh
pnpm install
pnpm dev
```

This starts the app in development mode, rebuilding assets on file changes.

## Build

To build the app for production:

```sh
pnpm build
```

## Features

- Upload resume PDFs and a job description
- Compute a simple match score between resume content and job description
- Generate interview questions using Gemini via the `@google/genai` SDK
- Server-function architecture with TanStack Start
