# FreelanceFlow

A calm, mobile-first workspace for solo freelance social-media managers to run
client onboarding, content calendars, approval workflows, and invoicing in
one place.

This repo was scaffolded from a product spec (PRD + schema + API design +
frontend mockup + code review + security audit) and implements the fixes
that review called out — proper async DB sessions, real login/refresh
endpoints, seeded lookup data, CORS, ownership checks on every client-scoped
route, and enforced approval-link expiry. Search the code for `Review
finding` comments to see exactly what was fixed and why.

## Structure

```
freelanceflow/
├── backend/     FastAPI + PostgreSQL API
├── frontend/    Next.js dashboard
└── docker-compose.yml   local full-stack dev (Postgres + API + web)
```

## Quickest path: Docker Compose

```bash
git clone <your-repo-url>
cd freelanceflow
docker compose up --build
```

- API: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Running services individually

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set JWT_SECRET, DATABASE_URL

# Postgres:
alembic upgrade head
python -m scripts.seed

uvicorn app.main:app --reload
# docs at http://localhost:8000/docs
```

For zero-setup local dev without Postgres, set `DATABASE_URL=sqlite+aiosqlite:///./dev.db`
in `.env` — tables are auto-created on startup when `APP_ENV=development`.

Run tests: `pytest`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
# http://localhost:3000
```

## Deploying

- **Frontend → Vercel**: import the repo, set root directory to `frontend`,
  set `NEXT_PUBLIC_API_URL` to your deployed API URL.
- **Backend → Render/Fly/Railway**: use `backend/Dockerfile`, set
  `DATABASE_URL`, `JWT_SECRET` (generate with
  `python -c "import secrets; print(secrets.token_urlsafe(48))"`), and
  `FRONTEND_ORIGINS` to your Vercel URL. Run `alembic upgrade head` then
  `python -m scripts.seed` as a release/pre-deploy step.
- **Database**: any managed Postgres (Supabase, Render Postgres, Neon, etc).

## Pushing this to GitHub

```bash
cd freelanceflow
git init
git add .
git commit -m "Initial FreelanceFlow scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## API summary

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | ❌ |
| POST | `/api/v1/auth/login` | ❌ |
| POST | `/api/v1/auth/refresh` | ❌ (refresh token) |
| GET | `/api/v1/auth/me` | ✅ |
| GET/POST | `/api/v1/clients` | ✅ |
| GET | `/api/v1/clients/{id}` | ✅ |
| PATCH | `/api/v1/clients/{id}/onboarding` | ✅ |
| GET/POST | `/api/v1/clients/{id}/content-items` | ✅ |
| GET | `/api/v1/approval-links/{token}` | ❌ (public token) |
| PATCH | `/api/v1/approval-links/{token}/status` | ❌ (public token) |
| POST | `/api/v1/approval-links/{token}/comments` | ❌ (public token) |
| POST | `/api/v1/clients/{id}/invoices` | ✅ |
| GET | `/api/v1/invoices` | ✅ |
| PATCH | `/api/v1/invoices/{id}/mark-paid` | ✅ |
| GET | `/api/v1/dashboard` | ✅ |

Full interactive docs at `/docs` once the API is running.

## Known follow-ups (from the security audit, not yet built)

- Rate limiting on auth endpoints
- httpOnly-cookie based token storage via a BFF layer (currently tokens
  live in `localStorage` on the frontend, with refresh-and-retry logic)
- Email verification / password reset flow
- CSV export and custom-branding for the paid tier
- Contract e-signature + welcome-packet PDF generation
