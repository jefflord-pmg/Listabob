# Copilot Instructions for Listabob

## Architecture

Listabob is a list management web app (think Airtable-lite) with a Python/FastAPI backend and React/TypeScript frontend, packaged as a standalone Windows executable via PyInstaller.

**Backend** (`backend/app/`): FastAPI REST API with SQLAlchemy ORM over SQLite. All API routes are prefixed with `/api`. In production/standalone mode, the backend also serves the built frontend as static files with SPA fallback routing.

**Frontend** (`frontend/src/`): React 19 SPA using Vite. In development, Vite proxies `/api` requests to `http://localhost:8000`. Uses TanStack Query for server state, React Context for auth/settings, and Tailwind CSS v4 + daisyUI 5 for styling.

**Standalone packaging**: `build.bat` builds the frontend, then uses PyInstaller (`listabob.spec`) to bundle everything into a single distributable folder. Entry point is `backend/run_standalone.py` which detects frozen mode, sets up data directories, and runs Uvicorn.

### Data model

The core entity hierarchy is: **List → Column + Item → ItemValue**. Lists own columns (typed schema) and items (rows). Each ItemValue stores data in a type-specific field (`value_text`, `value_number`, `value_date`, `value_boolean`, `value_json`) based on the column type. Items support soft deletion via `deleted_at` timestamp. All primary keys are string UUIDs.

Column types: `text`, `number`, `currency`, `date`, `datetime`, `choice`, `multiple_choice`, `boolean`, `hyperlink`, `rating` (plus `image`, `attachment`, `person`, `location` defined but less used). Column-specific config (choices, defaults, formatting) is stored in a JSON `config` field.

Views store their filter/sort/grouping configuration in a JSON `config` field. View types: `grid`, `gallery`, `calendar`, `board`.

### Authentication

Simple token-based auth. The token is a SHA-256 hash of `password:revoke_timestamp` from `config.json`. Changing the password or `revoke_timestamp` invalidates all sessions. The frontend stores the token in localStorage under `listabob_auth`.

## Commands

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Dev server at localhost:5173 (proxies /api to :8000)
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint (TypeScript + React Hooks rules)
```

### Full build (standalone exe)

```bash
# From project root
build.bat         # Builds frontend, runs PyInstaller, creates dist\Listabob\
```

### No test suite exists yet

The `backend/tests/` directory is empty and no frontend test runner is configured.

## Conventions

### Backend

- **Route organization**: One file per resource in `backend/app/api/`. Each exports an `APIRouter` included in `main.py` with `/api` prefix.
- **Dependency injection**: Routes receive `db: Session = Depends(get_db)` for database access.
- **Schemas**: All Pydantic models are in `backend/app/schemas/__init__.py` with `from_attributes = True` for SQLAlchemy compatibility.
- **Models**: All SQLAlchemy models are in `backend/app/models/__init__.py`.
- **Migrations**: Lightweight inline migrations in `backend/app/migrations.py` (ALTER TABLE statements), not Alembic migration files.
- **Status codes**: 201 for creation, 204 for deletion, 404 for not found, 401 for auth failures.
- **Config file**: `config.json` at project root (dev) or next to the executable (standalone). Fields: `password`, `revoke_timestamp`, `backup_path`, `port`.

### Frontend

- **API calls**: Axios client in `frontend/src/api/client.ts` with `baseURL: '/api'`. Resource-specific functions in `src/api/lists.ts` and `src/api/items.ts`.
- **Data fetching**: All server state goes through TanStack Query hooks in `src/hooks/`. Mutations invalidate related query keys to keep UI in sync. Query stale time is 60 seconds with 1 retry.
- **Component structure**: Components are organized by domain under `src/components/` — `cells/` (type-specific cell renderers), `columns/` (column management), `list/` (list cards/creation), `views/` (grid view, filter panel), `layout/` (sidebar, main layout), `ui/` (reusable Modal, ConfirmModal), `import/` (CSV import).
- **Styling**: Tailwind CSS v4 utility classes + daisyUI component classes (e.g., `btn`, `btn-primary`, `card`, `modal`, `input-bordered`). Two themes: `light` (default) and `dark`. Theme stored in `data-theme` HTML attribute and localStorage.
- **TypeScript**: Strict mode enabled. Core types in `src/types/index.ts`.
- **State**: React Query for server state, `AuthContext` and `SettingsContext` for app-wide state, `useState` for local UI state.
