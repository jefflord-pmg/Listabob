# Listabob External REST API

A simple, token-authenticated REST API for managing Listabob lists and items from external tools.

**Base URL:** `http://<host>:<port>/api/v1`  
**Default:** `http://localhost:8000/api/v1`

---

## Authentication

All `/api/v1/` endpoints require a **Bearer token** in the `Authorization` header.

### Getting a Token

Send your password to the login endpoint:

```
POST /api/auth/login
Content-Type: application/json

{"password": "your-password"}
```

Response:
```json
{
  "token": "a1b2c3d4e5...sha256hash",
  "revoke_timestamp": "2026-01-01T00:00:00Z"
}
```

### Using the Token

Include it in every request:

```
Authorization: Bearer a1b2c3d4e5...sha256hash
```

The token remains valid until the password or `revoke_timestamp` is changed in `config.json`.

---

## Endpoints

### List All Lists

```
GET /api/v1/lists
```

Returns all lists with item counts.

**Response** `200 OK`:
```json
[
  {
    "id": "abc-123",
    "name": "Groceries",
    "description": "Weekly shopping list",
    "icon": "🛒",
    "item_count": 12,
    "created_at": "2026-01-15T10:00:00",
    "updated_at": "2026-03-19T15:30:00"
  }
]
```

---

### Get List Details

```
GET /api/v1/lists/{list_id}
```

Returns list metadata including the column schema. Use this to discover what columns (fields) a list has.

**Response** `200 OK`:
```json
{
  "id": "abc-123",
  "name": "Groceries",
  "description": "Weekly shopping list",
  "icon": "🛒",
  "item_count": 12,
  "columns": [
    {
      "id": "col-1",
      "name": "Item Name",
      "type": "text",
      "position": 0,
      "is_required": true,
      "config": null
    },
    {
      "id": "col-2",
      "name": "Quantity",
      "type": "number",
      "position": 1,
      "is_required": false,
      "config": null
    },
    {
      "id": "col-3",
      "name": "Category",
      "type": "choice",
      "position": 2,
      "is_required": false,
      "config": {"choices": ["Produce", "Dairy", "Meat", "Bakery"]}
    }
  ],
  "created_at": "2026-01-15T10:00:00",
  "updated_at": "2026-03-19T15:30:00"
}
```

---

### Get Items in a List

```
GET /api/v1/lists/{list_id}/items
GET /api/v1/lists/{list_id}/items?include_deleted=true
```

Returns all items with values keyed by **column name** (not internal IDs).

**Response** `200 OK`:
```json
{
  "list_id": "abc-123",
  "list_name": "Groceries",
  "total": 3,
  "items": [
    {
      "id": "item-1",
      "list_id": "abc-123",
      "position": 0,
      "values": {
        "Item Name": "Apples",
        "Quantity": 6,
        "Category": "Produce"
      },
      "created_at": "2026-03-01T09:00:00",
      "updated_at": "2026-03-01T09:00:00",
      "deleted_at": null
    }
  ]
}
```

---

### Get a Single Item

```
GET /api/v1/lists/{list_id}/items/{item_id}
```

**Response** `200 OK`:
```json
{
  "id": "item-1",
  "list_id": "abc-123",
  "position": 0,
  "values": {
    "Item Name": "Apples",
    "Quantity": 6,
    "Category": "Produce"
  },
  "created_at": "2026-03-01T09:00:00",
  "updated_at": "2026-03-01T09:00:00",
  "deleted_at": null
}
```

---

### Create an Item

```
POST /api/v1/lists/{list_id}/items
Content-Type: application/json

{
  "values": {
    "Item Name": "Bananas",
    "Quantity": 4,
    "Category": "Produce"
  }
}
```

Use **column names** as keys (case-insensitive matching). Unknown column names return `400 Bad Request`.

**Response** `201 Created`: Same shape as Get Item.

---

### Update an Item

```
PUT /api/v1/lists/{list_id}/items/{item_id}
Content-Type: application/json

{
  "values": {
    "Quantity": 8
  }
}
```

Only the provided columns are updated; others are left unchanged.

**Response** `200 OK`: Same shape as Get Item.

---

### Delete an Item

```
DELETE /api/v1/lists/{list_id}/items/{item_id}
```

Performs a **soft delete** (sets `deleted_at`). The item can still be restored from the Listabob UI.

**Response** `204 No Content`

---

## Column Types Reference

| Type | Value Format | Example |
|------|-------------|---------|
| `text` | string | `"Hello world"` |
| `number` | number | `42` or `3.14` |
| `currency` | number | `19.99` |
| `date` | ISO date string | `"2026-03-20"` |
| `datetime` | ISO datetime string | `"2026-03-20T14:30:00"` |
| `boolean` | boolean | `true` / `false` |
| `choice` | string | `"Option A"` |
| `multiple_choice` | string or list | `"Option A"` |
| `rating` | number (1-5) | `4` |
| `hyperlink` | URL string | `"https://example.com"` |

---

## Error Responses

All errors follow this format:

```json
{"detail": "Error message here"}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request (e.g., unknown column name) |
| `401` | Missing or invalid token |
| `404` | List or item not found |

---

## Python Quick Start

```python
import requests

BASE = "http://localhost:8000/api"

# 1. Login to get a token
resp = requests.post(f"{BASE}/auth/login", json={"password": "your-password"})
token = resp.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. List all lists
lists = requests.get(f"{BASE}/v1/lists", headers=headers).json()
print(lists)

# 3. Get items from the first list
list_id = lists[0]["id"]
items = requests.get(f"{BASE}/v1/lists/{list_id}/items", headers=headers).json()
for item in items["items"]:
    print(item["values"])

# 4. Create an item
new_item = requests.post(
    f"{BASE}/v1/lists/{list_id}/items",
    headers=headers,
    json={"values": {"Item Name": "Oranges", "Quantity": 3}}
).json()
print(f"Created: {new_item['id']}")

# 5. Update an item
requests.put(
    f"{BASE}/v1/lists/{list_id}/items/{new_item['id']}",
    headers=headers,
    json={"values": {"Quantity": 10}}
)

# 6. Delete an item
requests.delete(
    f"{BASE}/v1/lists/{list_id}/items/{new_item['id']}",
    headers=headers,
)
```

A full reusable Python client is available in [`examples/listabob_client.py`](examples/listabob_client.py).
