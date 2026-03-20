# Listabob

A flexible list management web app for organizing data in customizable tables with multiple column types. Similar to Airtable or Notion databases.

## Features

### Lists & Data Management
- **Custom Lists** - Create unlimited lists with custom columns and data types
- **Multiple Column Types** - Text, Number, Currency, Date, DateTime, Choice, Multiple Choice, Boolean (Yes/No), Rating, Hyperlink
- **Inline Editing** - Click any cell to edit directly with type-specific editors
- **Favorites** - Mark lists as favorites for quick access in the sidebar

### Column Management
- **Add Columns** - Create columns with various data types
- **Edit Columns** - Rename columns, modify options for choice fields
- **Delete Columns** - Remove columns (with confirmation)
- **Reorder Columns** - Drag-and-drop column headers to rearrange
- **Column Type Conversion** - Convert Text columns to Choice or Multiple Choice (existing values become options)

### Filtering & Sorting
- **Row Sorting** - Click column headers to sort ascending/descending (persisted)
- **Filter Panel** - Filter by any column with checkbox selection
- **Saved Filters** - Save filter configurations with custom names for quick access
- **Case-Insensitive Filtering** - Text filters match regardless of case

### Import & Export
- **CSV Import** - Import data from CSV files with:
  - Drag-and-drop file upload
  - Automatic column type detection (dates, numbers, booleans, choices, etc.)
  - Header row detection
  - Preview before importing
- **CSV Export** - Export lists to CSV with or without headers

### User Interface
- **Responsive Design** - Works on desktop and mobile devices
- **Collapsible Sidebar** - Toggle sidebar visibility on mobile
- **Dark/Light Mode** - Theme toggle with system preference detection
- **Accessible Modals** - Full keyboard navigation, focus management, and screen reader support
- **Item Count** - Always visible count of items (with filtered count when filtering)
- **Search with ESC to Clear** - Search box across all fields; press ESC to clear
- **Tabbed System Settings** - Settings modal organized into tabs (Overview, Preferences, AI, Backup) to reduce scrolling

### Data Integrity
- **Recycle Bin** - Deleted items are soft-deleted and can be restored from the recycle bin
- **Undo Support** - Recover deleted data without permanent loss

### AI Features
- **AI Completion** - Auto-fill cells using AI-powered suggestions (batch mode across all items)
  - Handles choice and multiple choice columns — auto-adds new options when AI suggests values not in the existing list
  - Sends valid choice options to the AI so it can make informed suggestions
- **Single-Item AI Complete** - Fill multiple columns on a single item in one AI call, with preview before applying
  - Select any combination of columns to fill
  - Optional additional prompt instructions
  - Auto-adds new choice/multiple choice options when AI suggests values not in the existing list
  - Understands column types — returns arrays for multiple choice fields, ISO dates, booleans, numbers, etc.
- **Chat Integration** - Chat with AI for data insights and assistance, accessed via a tabbed modal alongside AI Complete
- **Configurable AI Model** - Use Gemini API with custom prompts and model selection

### External REST API

A token-authenticated REST API (`/api/v1`) for integrating Listabob with external tools and scripts:

- **List & item access** - Read lists and items from external apps
- **Create / update / delete items** - Full CRUD via HTTP with column-name-based field addressing
- **Soft deletes** - Deleted items land in the recycle bin and can be restored from the UI
- **Bearer token auth** - Same token used by the web app; obtained via `POST /api/auth/login`

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for the full endpoint reference and a Python quick-start. A reusable Python client is in [`examples/listabob_client.py`](examples/listabob_client.py).

### Other Features
- **Rename Lists** - Update list names from the menu
- **Delete Lists** - Remove lists with confirmation
- **New Row Visibility** - Newly added rows appear at the bottom and are highlighted
- **Persistent Views** - Sort order, column positions, and filters are saved automatically
- **Offline Support** - PWA functionality for improved performance and offline capabilities
- **Version Display** - Current build version shown in the System Settings modal (Overview tab)

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, daisyUI, TanStack Query

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Configuration

Before starting, create a config file for authentication:

```bash
# Copy the example config
cp config.example.json config.json

# Edit config.json and set your password
```

**config.json format:**
```json
{
  "password": "your-secure-password",
  "revoke_timestamp": "2026-01-01T00:00:00Z"
}
```

- `password`: The password required to access the app
- `revoke_timestamp`: Change this timestamp to log out all currently authenticated users

> **Note:** `config.json` is gitignored and will not be committed to the repository.

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Getting Started
1. **Create a List** - Click "New List" on the home page
2. **Add Columns** - Click the "+ Column" button to add columns with different data types
3. **Add Rows** - Click "Add Row" at the bottom of the table
4. **Edit Cells** - Click any cell to edit its value

### Working with Columns
- **Reorder** - Drag column headers using the grip handle (⠿) to rearrange
- **Sort** - Click a column name to sort (click again to toggle direction, third click clears)
- **Edit** - Click the gear icon (⚙) on a column header to rename, edit options, or delete
- **Convert Type** - In the edit panel, convert Text columns to Choice/Multiple Choice

### Filtering Data
1. Click the **Filter** button to open the filter panel
2. Check values to include in the filter for each column
3. Multiple column filters are combined with AND logic
4. Click **Save Filter** to save the current filter with a name
5. Use the **Saved Filters** dropdown to quickly apply saved filters

### Importing Data
1. Click the menu (⋮) on any list or use "Import CSV" from the home page
2. Drag and drop a CSV file or click to browse
3. Enter a name for the new list
4. Check "First row contains column names" if applicable
5. Review and adjust detected column types
6. Click "Import" to create the list with data

### Exporting Data
1. Open a list and click the menu (⋮)
2. Choose "With Headers" or "Without Headers" under Export CSV

## Project Structure

```
Listabob/
├── backend/
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── chat.py       # Chat/AI endpoints
│   │   │   ├── exports.py    # CSV export endpoints
│   │   │   ├── external.py   # External REST API (/api/v1)
│   │   │   ├── imports.py    # CSV import endpoints
│   │   │   ├── items.py      # Item/row management
│   │   │   ├── lists.py      # List management
│   │   │   ├── system.py     # System/config endpoints
│   │   │   ├── templates.py  # Template endpoints
│   │   │   └── views.py      # View management
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic services
│   │   ├── utils/            # Utility functions
│   │   ├── config.py         # Configuration loader
│   │   ├── database.py       # Database connection/session
│   │   ├── logger.py         # Logging configuration
│   │   ├── main.py           # FastAPI application setup
│   │   ├── migrations.py     # Database migrations
│   │   └── __init__.py
│   ├── requirements.txt
│   └── run_standalone.py     # Entry point for standalone executable
├── frontend/
│   ├── src/
│   │   ├── api/              # API client functions
│   │   ├── components/
│   │   │   ├── cells/        # Cell editor components
│   │   │   ├── columns/      # Column management components
│   │   │   ├── import/       # CSV import components
│   │   │   ├── layout/       # Layout components (Sidebar, etc.)
│   │   │   ├── list/         # List-related components
│   │   │   ├── ui/           # Reusable UI components (Modal, etc.)
│   │   │   └── views/        # View components (GridView, FilterPanel)
│   │   ├── contexts/         # React Context providers (Auth, Settings)
│   │   ├── hooks/            # Custom React hooks (TanStack Query integrations)
│   │   ├── pages/            # Page components
│   │   ├── types/            # TypeScript type definitions
│   │   ├── assets/           # Static assets (images, icons, etc.)
│   │   ├── App.tsx           # Root React component
│   │   ├── main.tsx          # Application entry point
│   │   └── index.css         # Global styles
│   ├── package.json
│   └── vite.config.ts        # Vite configuration
├── data/                     # SQLite database location (generated at runtime)
├── examples/                 # Example scripts (e.g., listabob_client.py)
├── build.bat                 # Build script for standalone executable
├── listabob.spec             # PyInstaller configuration
├── API_DOCUMENTATION.md      # External REST API reference
├── config.json               # Configuration file (gitignored)
├── config.example.json       # Example configuration
└── README.md
```

## Wish List

Future enhancements planned for Listabob:
- **Custom AI Providers** - Support for custom OpenAI-compatible providers with configurable:
  - Base URL
  - API Key
  - Model ID/Name

## Building & Releases

### Download Releases

Pre-built releases are available at: https://github.com/jefflord-pmg/Listabob/releases

### Building the Executable

To package Listabob as a standalone Windows executable:

```bash
# From the project root directory
build.bat
```

This will:
1. Build the frontend with `npm run build`
2. Install PyInstaller (if needed)
3. Create the executable using the `listabob.spec` file

Output will be in `dist\Listabob\`. The entire folder can be distributed.

### Creating a New Release

1. Build the executable with `build.bat`
2. Archive the `dist\Listabob` folder (e.g., to `Listabob.7z`)
3. Upload to GitHub releases:

```bash
gh release create "v1.0.0" Listabob.7z
```

For preview releases:
```bash
gh release create "preview-1" Listabob.7z
```

## License

MIT
