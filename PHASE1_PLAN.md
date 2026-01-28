# Listabob Phase 1: Column Management & Data Types

## Overview
The most critical missing feature is the ability to **add, configure, and manage columns** with various data types. Without this, users are stuck with whatever columns were created initially.

---

## Priority 1: Add Column UI

### 1.1 Column Manager Panel
Add a "+" button in the grid header to add new columns.

**UI Flow:**
1. Click "+" button at end of column headers
2. Modal opens with:
   - Column name input
   - Column type dropdown (Text, Number, Currency, Date, Choice, Yes/No, Hyperlink, Rating)
   - Type-specific configuration (e.g., choices for dropdown)
3. Click "Add Column" to save

### 1.2 Column Header Menu
Right-click or click dropdown on column header to:
- Edit column (rename, change config)
- Delete column
- Reorder (move left/right)

---

## Priority 2: Cell Editors for Each Type

### 2.1 Text
- ✅ Already working (simple input)

### 2.2 Number
- ✅ Already working (number input)

### 2.3 Rating  
- ✅ Already working (displays as stars)

### 2.4 Currency
- Show "$" prefix
- Format with 2 decimal places
- Number input

### 2.5 Date/DateTime
- Date picker component
- Display formatted date (e.g., "Jan 28, 2026")

### 2.6 Choice (Dropdown)
- Configuration: list of options
- Cell shows dropdown to select one option
- Color-coded badges/pills

### 2.7 Yes/No (Boolean)
- Checkbox in cell
- Toggle on click

### 2.8 Hyperlink
- Input for URL
- Display as clickable link

---

## Priority 3: List Management

### 3.1 Delete List
- Add "Delete List" option in the list page menu (already has dropdown)
- Confirmation dialog
- Redirect to home after delete

### 3.2 Edit List Details
- Edit name, description, icon from list page

---

## Implementation Tasks

### Backend (Already Mostly Done)
- [x] Column CRUD API exists
- [x] All column types defined in schema
- [ ] Add column reorder endpoint

### Frontend Components to Build

```
frontend/src/components/
├── columns/
│   ├── AddColumnModal.tsx      # Modal to add new column
│   ├── ColumnHeaderMenu.tsx    # Dropdown menu on column header
│   ├── ColumnTypeSelect.tsx    # Dropdown to pick column type
│   └── ColumnConfig.tsx        # Type-specific config (choices, etc.)
├── cells/
│   ├── TextCell.tsx            # ✅ Exists (inline in GridView)
│   ├── NumberCell.tsx          # ✅ Exists
│   ├── RatingCell.tsx          # ✅ Exists  
│   ├── CurrencyCell.tsx        # NEW
│   ├── DateCell.tsx            # NEW - needs date picker
│   ├── ChoiceCell.tsx          # NEW - dropdown select
│   ├── BooleanCell.tsx         # NEW - checkbox
│   └── HyperlinkCell.tsx       # NEW - link display/edit
```

### Estimated Effort
- Add Column Modal: 2 hours
- Column Header Menu: 1 hour
- Date Cell + Picker: 2 hours
- Choice Cell + Config: 2 hours
- Boolean Cell: 30 min
- Currency Cell: 30 min
- Hyperlink Cell: 1 hour
- Delete List: 30 min

**Total: ~10 hours**

---

## UI Mockup (ASCII)

### Grid with Add Column Button
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Movies                                    ⭐ ⋮       │
├─────────────────────────────────────────────────────────┤
│ Title ▼    │ Rating ▼  │ Status ▼   │ Release ▼ │ [+]  │
├────────────┼───────────┼────────────┼───────────┼──────┤
│ The Matrix │ ⭐⭐⭐⭐⭐   │ ● Watched  │ Mar 1999  │  🗑  │
│ Inception  │ ⭐⭐⭐⭐    │ ○ To Watch │ Jul 2010  │  🗑  │
├────────────┴───────────┴────────────┴───────────┴──────┤
│ [+ Add Row]                                             │
└─────────────────────────────────────────────────────────┘
```

### Add Column Modal
```
┌─────────────────────────────────────┐
│ Add Column                      ✕   │
├─────────────────────────────────────┤
│ Name:                               │
│ ┌─────────────────────────────────┐ │
│ │ Status                          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Type:                               │
│ ┌─────────────────────────────────┐ │
│ │ Choice (Dropdown)           ▼   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Options:                            │
│ ┌─────────────────────────────────┐ │
│ │ To Watch                        │ │
│ │ Watching                        │ │
│ │ Watched                         │ │
│ │ [+ Add option]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│        [Cancel]  [Add Column]       │
└─────────────────────────────────────┘
```

---

## Next Steps
1. Build AddColumnModal component
2. Add "+" button to GridView header
3. Build cell editors for each type
4. Add column header dropdown menu
5. Test end-to-end
