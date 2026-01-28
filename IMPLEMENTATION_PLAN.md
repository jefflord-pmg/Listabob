# Listabob Implementation Plan

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11+ with FastAPI |
| **Database** | SQLite with SQLAlchemy ORM |
| **Frontend** | React 18 + TypeScript |
| **Styling** | Tailwind CSS + daisyUI |
| **State Management** | TanStack Query (React Query) |
| **Build Tool** | Vite |
| **API Communication** | REST with OpenAPI/Swagger docs |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │ Grid    │ │ Gallery │ │ Calendar│ │ Board View  │   │
│  │ View    │ │ View    │ │ View    │ │ (Kanban)    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Component Library                   │   │
│  │         (Tailwind + daisyUI components)         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                     REST API (JSON)
                            │
┌─────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ List API    │ │ Item API    │ │ View/Filter API │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Column API  │ │ Template API│ │ Import/Export   │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │            SQLAlchemy ORM + Alembic             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    SQLite Database                       │
│  lists | columns | items | item_values | views | rules  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Lists (the containers)
CREATE TABLE lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    template_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Column definitions (schema for each list)
CREATE TABLE columns (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    column_type TEXT NOT NULL, -- text, number, currency, date, choice, person, boolean, hyperlink, image, attachment, location, calculated, lookup
    position INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    config JSON, -- type-specific config (choices, formula, lookup_list_id, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items (rows in a list)
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item values (cell data - EAV pattern for flexibility)
CREATE TABLE item_values (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number REAL,
    value_date TIMESTAMP,
    value_boolean BOOLEAN,
    value_json JSON, -- for complex types (attachments, multiple choice, etc.)
    UNIQUE(item_id, column_id)
);

-- Saved views
CREATE TABLE views (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    view_type TEXT NOT NULL, -- grid, gallery, calendar, board
    config JSON, -- filters, sorts, grouping, visible columns, etc.
    is_default BOOLEAN DEFAULT FALSE,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conditional formatting rules
CREATE TABLE formatting_rules (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT,
    condition JSON NOT NULL, -- { column_id, operator, value }
    format JSON NOT NULL, -- { backgroundColor, textColor, icon, etc. }
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Smart rules (automation)
CREATE TABLE smart_rules (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- item_created, item_updated, field_changed
    trigger_config JSON,
    action_type TEXT NOT NULL, -- set_field, notify, etc.
    action_config JSON,
    is_active BOOLEAN DEFAULT TRUE
);

-- Templates
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    columns_config JSON NOT NULL, -- array of column definitions
    sample_data JSON, -- optional sample items
    is_builtin BOOLEAN DEFAULT TRUE
);

-- File attachments
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Project Structure

```
listabob/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── config.py               # Settings/configuration
│   │   ├── database.py             # SQLAlchemy setup
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── list.py
│   │   │   ├── column.py
│   │   │   ├── item.py
│   │   │   ├── view.py
│   │   │   ├── rule.py
│   │   │   └── template.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── list.py
│   │   │   ├── column.py
│   │   │   ├── item.py
│   │   │   └── view.py
│   │   ├── api/                    # API routes
│   │   │   ├── __init__.py
│   │   │   ├── lists.py
│   │   │   ├── columns.py
│   │   │   ├── items.py
│   │   │   ├── views.py
│   │   │   ├── templates.py
│   │   │   └── import_export.py
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── list_service.py
│   │   │   ├── item_service.py
│   │   │   ├── formula_engine.py   # Calculated columns
│   │   │   ├── rule_engine.py      # Smart rules
│   │   │   └── import_service.py   # Excel/CSV import
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── file_storage.py
│   ├── alembic/                    # Database migrations
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                    # API client
│   │   │   ├── client.ts
│   │   │   ├── lists.ts
│   │   │   ├── items.ts
│   │   │   └── types.ts
│   │   ├── components/
│   │   │   ├── ui/                 # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── list/
│   │   │   │   ├── ListCard.tsx
│   │   │   │   ├── ListHeader.tsx
│   │   │   │   └── ColumnEditor.tsx
│   │   │   ├── views/
│   │   │   │   ├── GridView.tsx
│   │   │   │   ├── GalleryView.tsx
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   ├── BoardView.tsx
│   │   │   │   └── ViewSwitcher.tsx
│   │   │   ├── cells/              # Cell renderers/editors
│   │   │   │   ├── TextCell.tsx
│   │   │   │   ├── NumberCell.tsx
│   │   │   │   ├── DateCell.tsx
│   │   │   │   ├── ChoiceCell.tsx
│   │   │   │   ├── ImageCell.tsx
│   │   │   │   └── ...
│   │   │   ├── forms/
│   │   │   │   ├── ItemForm.tsx
│   │   │   │   └── ListForm.tsx
│   │   │   └── filters/
│   │   │       ├── FilterBar.tsx
│   │   │       └── FilterPill.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Dashboard
│   │   │   ├── ListPage.tsx        # Single list view
│   │   │   ├── TemplatesPage.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useLists.ts
│   │   │   ├── useItems.ts
│   │   │   └── useViews.ts
│   │   ├── stores/                 # Zustand or context
│   │   │   └── uiStore.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── validators.ts
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── data/                           # SQLite DB + file uploads
├── docker-compose.yml              # Optional containerization
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
> Goal: Basic CRUD for lists and items

**Backend Tasks:**
- [ ] Set up FastAPI project structure
- [ ] Configure SQLAlchemy + SQLite
- [ ] Set up Alembic migrations
- [ ] Implement List model and CRUD API
- [ ] Implement Column model and CRUD API
- [ ] Implement Item model and CRUD API (with EAV pattern for values)
- [ ] Add basic validation with Pydantic schemas
- [ ] Add OpenAPI documentation

**Frontend Tasks:**
- [ ] Set up Vite + React + TypeScript project
- [ ] Configure Tailwind CSS + daisyUI
- [ ] Create base layout (sidebar, header)
- [ ] Build Home page (list of lists)
- [ ] Build List creation modal
- [ ] Build basic Grid View (table with inline editing)
- [ ] Implement API client with TanStack Query

**Deliverable:** Create a list, add columns, add/edit items in grid view

---

### Phase 2: Column Types & Data Entry (Week 3-4)
> Goal: Support all column types with proper editors

**Backend Tasks:**
- [ ] Implement column type validation
- [ ] Add file upload endpoint for attachments
- [ ] Implement choice/dropdown options storage
- [ ] Add bulk item create/update endpoints

**Frontend Tasks:**
- [ ] Build cell editors for each column type:
  - [ ] Text (single/multi-line)
  - [ ] Number & Currency
  - [ ] Date/DateTime picker
  - [ ] Choice (dropdown) & Multiple Choice
  - [ ] Yes/No (checkbox)
  - [ ] Hyperlink
  - [ ] Image (with preview)
  - [ ] File attachment
  - [ ] Rating (stars)
- [ ] Build column configuration panel (add/edit/delete/reorder columns)
- [ ] Implement keyboard navigation in grid
- [ ] Add drag-and-drop for images

**Deliverable:** Full data entry experience with all column types

---

### Phase 3: Views & Visualization (Week 5-6)
> Goal: Multiple view types and saved views

**Backend Tasks:**
- [ ] Implement View model and CRUD API
- [ ] Add filtering logic (server-side)
- [ ] Add sorting logic
- [ ] Add grouping logic
- [ ] Implement view-specific queries

**Frontend Tasks:**
- [ ] Build ViewSwitcher component (tabs)
- [ ] Implement Gallery View (card grid)
- [ ] Implement Calendar View (use a library like FullCalendar)
- [ ] Implement Board View (Kanban with drag-and-drop)
- [ ] Build Filter Bar with filter pills
- [ ] Build Sort configuration UI
- [ ] Build Group by configuration UI
- [ ] Implement "Save View" functionality

**Deliverable:** Switch between Grid/Gallery/Calendar/Board views with filters

---

### Phase 4: Conditional Formatting & Rules (Week 7-8)
> Goal: Visual formatting and basic automation

**Backend Tasks:**
- [ ] Implement formatting rules storage
- [ ] Implement smart rules storage
- [ ] Build rule evaluation engine
- [ ] Add rule trigger hooks (on item create/update)

**Frontend Tasks:**
- [ ] Build Conditional Formatting rule editor
- [ ] Apply formatting in all views
- [ ] Build Smart Rules editor UI
- [ ] Show rule-triggered notifications/alerts

**Deliverable:** Highlight overdue items, trigger alerts on status change

---

### Phase 5: Templates & Import (Week 9-10)
> Goal: Quick start with templates and data import

**Backend Tasks:**
- [ ] Create built-in templates (seed data):
  - [ ] Issue Tracker
  - [ ] Event Itinerary
  - [ ] Asset Manager
  - [ ] Movies/TV/Games
  - [ ] Employee Onboarding
  - [ ] Content Scheduler
- [ ] Implement Excel import (openpyxl)
- [ ] Implement CSV import
- [ ] Implement list structure cloning

**Frontend Tasks:**
- [ ] Build Templates page with categories
- [ ] Build template preview and selection UI
- [ ] Build import wizard (file upload → column mapping → preview → import)
- [ ] Build "Create from existing list" flow

**Deliverable:** Start from templates or import from Excel/CSV

---

### Phase 6: Forms & Polish (Week 11-12)
> Goal: Custom forms and UX polish

**Backend Tasks:**
- [ ] Implement form configuration storage
- [ ] Add calculated column evaluation
- [ ] Add lookup column resolution
- [ ] Performance optimization (indexes, query optimization)

**Frontend Tasks:**
- [ ] Build customizable Item Form
- [ ] Add conditional logic for form fields
- [ ] Implement Favorites functionality
- [ ] Build Recent Lists section on Home
- [ ] Add list search/filter on Home
- [ ] Mobile responsive polish
- [ ] PWA configuration (manifest, service worker)
- [ ] Loading states and error handling
- [ ] Keyboard shortcuts

**Deliverable:** Polished, production-ready single-user app

---

## API Endpoints Summary

### Lists
```
GET    /api/lists              # List all lists
POST   /api/lists              # Create list
GET    /api/lists/{id}         # Get list with columns
PUT    /api/lists/{id}         # Update list
DELETE /api/lists/{id}         # Delete list
POST   /api/lists/{id}/clone   # Clone list structure
```

### Columns
```
GET    /api/lists/{id}/columns         # Get columns
POST   /api/lists/{id}/columns         # Add column
PUT    /api/lists/{id}/columns/{col}   # Update column
DELETE /api/lists/{id}/columns/{col}   # Delete column
PUT    /api/lists/{id}/columns/reorder # Reorder columns
```

### Items
```
GET    /api/lists/{id}/items           # Get items (with filters, pagination)
POST   /api/lists/{id}/items           # Create item
PUT    /api/lists/{id}/items/{item}    # Update item
DELETE /api/lists/{id}/items/{item}    # Delete item
POST   /api/lists/{id}/items/bulk      # Bulk create/update
```

### Views
```
GET    /api/lists/{id}/views           # Get saved views
POST   /api/lists/{id}/views           # Create view
PUT    /api/lists/{id}/views/{view}    # Update view
DELETE /api/lists/{id}/views/{view}    # Delete view
```

### Templates
```
GET    /api/templates                  # List templates
GET    /api/templates/{id}             # Get template details
POST   /api/lists/from-template/{id}   # Create list from template
```

### Import/Export
```
POST   /api/import/excel               # Import from Excel
POST   /api/import/csv                 # Import from CSV
GET    /api/lists/{id}/export/csv      # Export to CSV
GET    /api/lists/{id}/export/excel    # Export to Excel
```

### Files
```
POST   /api/files/upload               # Upload attachment
GET    /api/files/{id}                 # Download attachment
DELETE /api/files/{id}                 # Delete attachment
```

---

## Key Libraries

### Backend (Python)
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic>=2.5.0
python-multipart>=0.0.6
openpyxl>=3.1.0          # Excel import/export
aiofiles>=23.2.0         # Async file handling
python-dateutil>=2.8.0
```

### Frontend (Node.js)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-table": "^8.11.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0",
    "@fullcalendar/react": "^6.1.0",
    "@dnd-kit/core": "^6.1.0",
    "react-dropzone": "^14.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "daisyui": "^4.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## Development Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head      # Run migrations
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev               # Start dev server on port 5173

# Full stack (with docker-compose)
docker-compose up --build
```

---

## Future Considerations (Post-MVP)

- **Authentication:** Add user accounts (OAuth, email/password)
- **Collaboration:** Real-time sync with WebSockets
- **Search:** Full-text search across lists
- **Version History:** Track item changes
- **AI Features:** Natural language list creation, data summarization
- **Mobile App:** React Native or PWA enhancements
- **Cloud Deployment:** PostgreSQL, S3 for files, proper hosting

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| EAV pattern query complexity | Pre-materialize common queries; add indexes |
| Large file uploads | Stream uploads; set size limits; lazy loading |
| Complex calculated columns | Limit formula complexity; cache results |
| Calendar/Board performance | Virtual scrolling; pagination |

---
