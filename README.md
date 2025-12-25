# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# recommsys

Repository for our **Recommendation System project** (UCL COMP 2025).  
It contains the frontend, backend, and shared code in one repository.

## Project Structure

```recommsys/
│
├── web/ # React + Vite frontend (TypeScript + Axios)
├── worker/ # Express + TypeScript backend (feeds API)
├── shared/ # Shared TypeScript types and Zod schemas
├── package.json # Root workspaces + scripts
├── package-lock.json
└── README.md
```
## Worker

Backend service for recommsys.

## Setup

```bash
npm install
```

## Run the project
```bash
npm run dev
```
Frontend → http://localhost:5173
Backend → http://localhost:8787

Run only the frontend:
```bash
npm run dev:web
```
Run only the backend:
```bash
npm run dev:worker
```

## Build (for deployment)

Builds both frontend + backend:
```bash
npm run build
```

Lint (frontend only):
```bash
npm run lint
```
Testing
=======

This repo includes **production-style testing** across backend + frontend:

*   **Unit tests** (fast, isolated logic tests)
    
*   **Integration tests** (real Express routes + DB writes with Prisma)
    
*   **E2E tests** (Playwright “real user” browser flow)
    

1) Worker (Backend) Tests — Vitest
----------------------------------

Run all backend tests (watch mode):
```bash
cd worker
npx vitest
```
Run once (CI mode):
```bash
cd worker
npm run test
```
Coverage:
```bash
cd worker
npm run test:coverage
```
### What backend tests cover

*   **Unit tests**: core scoring helpers and recommendation logic (worker/tests/unit/...)
    
*   **Integration tests**: real Express routes + Prisma DB writes (worker/tests/integration/...)
    
    *   production auth flow (signup + login, cookie-based)
        
    *   POST /recommend returns results and writes a RecommendationEvent
        
    *   GET /recommendations regression test confirms history mapping returns topModelName
        
    *   contract test validates output shape + score/confidence bounds (0..1)
        

> Integration tests clean up test users + events to keep DB state deterministic.

2) Web (Frontend) E2E Tests — Playwright
----------------------------------------

Run Playwright tests (headless):
```bash
cd web
npx playwright test
```
Run Playwright with browser UI:
```bash
cd web
npx playwright test --headed
```
### What E2E covers

*   Signup with a unique test user
    
*   Navigate to Advisor page
    
*   Click Recommend
    
*   Assert recommendation results appear in the UI (e.g. #1 — ...)
    

3) Running E2E Locally (Important)
----------------------------------

Before running Playwright, make sure **both servers are running**:

Terminal 1 (backend):
```bash
cd worker
npm run dev
```
Terminal 2 (frontend):
```bash
cd web
npm run dev
```
Then run Playwright:
```bash
cd web
npx playwright test
```
4) Test Output / Ignored Files
------------------------------

Playwright generates local artifacts that should NOT be committed:

*   web/test-results/
    
*   web/playwright-report/
    

These should be in .gitignore.

CI (GitHub Actions)
===================

This repo includes a CI workflow that runs worker tests automatically on:

*   every push
    
*   every pull\_request
    

Workflow file:

*   .github/workflows/worker-tests.yml
    

The CI pipeline provisions Postgres and runs:

*   Prisma migrations (or prisma db push)
    
*   npm run test:coverage in worker/

---

## Dependencies
### Backend (`worker/`)
- `express` → web server framework  
- `cors` → allow cross-origin requests (frontend ↔ backend)  
- `rss-parser` → fetch and parse RSS feeds  
- `zod` → schema validation  
- **Dev:** `typescript`, `ts-node`, `nodemon`, `@types/node`, `@types/express`

---

### Frontend (`web/`)
- `react`, `react-dom` → UI framework  
- `axios` → HTTP client for API requests  
- **Dev:** `vite`, `@vitejs/plugin-react`, `typescript`, `eslint`, `typescript-eslint`

---

### Root
- `concurrently` → run frontend + backend in parallel (`npm run dev`)

## API Contract

### `GET /health`
- **Description:** Health check endpoint  
- **Response:**
```json
{ "ok": true }
```
---

### GET /feeds
- **Description:** Returns a list of normalized feed items
- **Response (array of FeedItem):**
```typescript
{
  id: string,
  title: string,
  source: string,
  link: string,
  authors: string[],
  summary?: string,
  type: "paper" | "blog" | "repo",
  date: string, // ISO format
  tags: string[]
}
```

---

## Development Notes
- **CORS** → allows frontend to fetch from backend  
- **Nodemon** → restarts backend automatically when files change  
- **Axios** → used in frontend for API requests  
- **Shared schemas** → in `/shared`, keep frontend + backend in sync  

---

## Authors
