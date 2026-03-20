"""
Listabob REST API Client

A simple Python client for the Listabob external API (v1).
Requires: pip install requests

Usage:
    from listabob_client import ListabobClient

    client = ListabobClient("http://localhost:8000", password="your-password")
    lists = client.get_lists()
    items = client.get_items(lists[0]["id"])
"""

from __future__ import annotations

import requests
from typing import Any


class ListabobClient:
    """Thin wrapper around the Listabob /api/v1 endpoints."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        *,
        password: str | None = None,
        token: str | None = None,
    ):
        """
        Create a client.

        Provide either ``password`` (will login automatically) or a pre-existing
        ``token``.  At least one is required.
        """
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()

        if token:
            self._session.headers["Authorization"] = f"Bearer {token}"
        elif password:
            self.login(password)
        else:
            raise ValueError("Provide either 'password' or 'token'.")

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def login(self, password: str) -> dict:
        """Authenticate and store the token for future requests."""
        resp = self._post("/api/auth/login", json={"password": password})
        self._session.headers["Authorization"] = f"Bearer {resp['token']}"
        return resp

    # ------------------------------------------------------------------
    # Lists
    # ------------------------------------------------------------------

    def get_lists(self) -> list[dict]:
        """Return all lists with item counts."""
        return self._get("/api/v1/lists")

    def get_list(self, list_id: str) -> dict:
        """Return list details including column schema."""
        return self._get(f"/api/v1/lists/{list_id}")

    # ------------------------------------------------------------------
    # Items
    # ------------------------------------------------------------------

    def get_items(
        self, list_id: str, *, include_deleted: bool = False
    ) -> dict:
        """Return all items in a list.

        Returns dict with keys: list_id, list_name, total, items.
        Each item's ``values`` dict is keyed by column name.
        """
        params = {}
        if include_deleted:
            params["include_deleted"] = "true"
        return self._get(f"/api/v1/lists/{list_id}/items", params=params)

    def get_item(self, list_id: str, item_id: str) -> dict:
        """Return a single item."""
        return self._get(f"/api/v1/lists/{list_id}/items/{item_id}")

    def create_item(self, list_id: str, values: dict[str, Any]) -> dict:
        """Create a new item.  ``values`` is {column_name: value}."""
        return self._post(
            f"/api/v1/lists/{list_id}/items", json={"values": values}
        )

    def update_item(
        self, list_id: str, item_id: str, values: dict[str, Any]
    ) -> dict:
        """Update specific columns on an item."""
        return self._put(
            f"/api/v1/lists/{list_id}/items/{item_id}",
            json={"values": values},
        )

    def delete_item(self, list_id: str, item_id: str) -> None:
        """Soft-delete an item."""
        self._delete(f"/api/v1/lists/{list_id}/items/{item_id}")

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def find_list(self, name: str) -> dict | None:
        """Find a list by name (case-insensitive). Returns None if not found."""
        for lst in self.get_lists():
            if lst["name"].lower() == name.lower():
                return lst
        return None

    def find_items(
        self, list_id: str, **filters: Any
    ) -> list[dict]:
        """Return items matching all given column_name=value filters.

        Example::

            client.find_items(list_id, Category="Produce", Quantity=6)
        """
        all_items = self.get_items(list_id)["items"]
        results = []
        for item in all_items:
            vals = {k.lower(): v for k, v in item["values"].items()}
            if all(vals.get(k.lower()) == v for k, v in filters.items()):
                results.append(item)
        return results

    # ------------------------------------------------------------------
    # Internal HTTP helpers
    # ------------------------------------------------------------------

    def _get(self, path: str, **kwargs) -> Any:
        return self._request("GET", path, **kwargs)

    def _post(self, path: str, **kwargs) -> Any:
        return self._request("POST", path, **kwargs)

    def _put(self, path: str, **kwargs) -> Any:
        return self._request("PUT", path, **kwargs)

    def _delete(self, path: str, **kwargs) -> None:
        resp = self._session.delete(f"{self.base_url}{path}", **kwargs)
        resp.raise_for_status()

    def _request(self, method: str, path: str, **kwargs) -> Any:
        resp = self._session.request(method, f"{self.base_url}{path}", **kwargs)
        resp.raise_for_status()
        return resp.json()


# ----------------------------------------------------------------------
# CLI demo
# ----------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Listabob API demo")
    parser.add_argument("--url", default="http://localhost:8000", help="Server URL")
    parser.add_argument("--password", required=True, help="Listabob password")
    args = parser.parse_args()

    client = ListabobClient(args.url, password=args.password)

    print("=== All Lists ===")
    lists = client.get_lists()
    for lst in lists:
        print(f"  {lst['name']} ({lst['item_count']} items) — {lst['id']}")

    if lists:
        first = lists[0]
        print(f"\n=== Items in '{first['name']}' ===")
        data = client.get_items(first["id"])
        for item in data["items"]:
            print(f"  [{item['id'][:8]}] {json.dumps(item['values'], default=str)}")
