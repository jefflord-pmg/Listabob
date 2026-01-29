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

### Other Features
- **Rename Lists** - Update list names from the menu
- **Delete Lists** - Remove lists with confirmation
- **New Row Visibility** - Newly added rows appear at the bottom and are highlighted
- **Persistent Views** - Sort order, column positions, and filters are saved automatically

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
│   │   ├── api/          # API route handlers
│   │   │   ├── lists.py
│   │   │   ├── items.py
│   │   │   ├── views.py
│   │   │   ├── imports.py
│   │   │   └── exports.py
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── main.py       # FastAPI application
│   │   └── database.py   # Database configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # API client functions
│   │   ├── components/
│   │   │   ├── cells/    # Cell editor components
│   │   │   ├── columns/  # Column management components
│   │   │   ├── import/   # CSV import components
│   │   │   ├── layout/   # Layout components (Sidebar, etc.)
│   │   │   ├── list/     # List-related components
│   │   │   ├── ui/       # Reusable UI components (Modal, etc.)
│   │   │   └── views/    # View components (GridView, FilterPanel)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript types
│   └── package.json
├── data/                 # SQLite database location
└── README.md
```

## License

MIT
