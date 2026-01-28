# Listabob

A flexible list management web app for organizing data in customizable tables with multiple column types.

## Features

- **Custom Lists** - Create lists with custom columns and data types
- **Multiple Column Types** - Text, Number, Currency, Date, Choice, Boolean, Rating, Hyperlink
- **Inline Editing** - Click any cell to edit directly
- **Column Management** - Add, rename, delete, and reorder columns via drag-and-drop
- **Row Sorting** - Click column headers to sort (ascending/descending)
- **Favorites** - Mark lists as favorites for quick access
- **Persistent Views** - Sort order and column positions are saved automatically

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, daisyUI

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

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
uvicorn app.main:app --reload --port 8000
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

1. **Create a List** - Click "New List" on the home page
2. **Add Columns** - Click the "+" button in the column header to add columns with different data types
3. **Add Rows** - Click "Add Row" at the bottom of the table
4. **Edit Cells** - Click any cell to edit its value
5. **Reorder Columns** - Drag column headers to rearrange
6. **Sort Rows** - Click a column header to sort (click again to toggle direction)
7. **Manage Columns** - Click the menu button on a column header to rename or delete

## Project Structure

```
Listabob/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── main.py       # FastAPI application
│   │   └── database.py   # Database configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # API client functions
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript types
│   └── package.json
└── README.md
```

## License

MIT
