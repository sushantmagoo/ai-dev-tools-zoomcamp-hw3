def test_list_expenses_seeded_and_sorted_desc_by_date(client):
    resp = client.get("/api/expenses")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 5
    dates = [e["date"] for e in body]
    assert dates == sorted(dates, reverse=True)


def test_create_expense_computes_total_from_splits(client):
    payload = {
        "title": "Takeout",
        "payerId": "m1",
        "date": "2026-09-13",
        "splits": [
            {"personId": "m1", "amount": 10.00},
            {"personId": "m2", "amount": 15.00},
        ],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["amount"] == 25.00
    assert body["title"] == "Takeout"
    assert body["payerId"] == "m1"
    assert body["date"] == "2026-09-13"
    assert body["id"]

    listed = client.get("/api/expenses").json()
    assert any(e["id"] == body["id"] for e in listed)


def test_create_expense_defaults_date_to_today(client):
    import datetime

    payload = {
        "title": "Snacks",
        "payerId": "m1",
        "splits": [{"personId": "m1", "amount": 5.00}],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 201
    assert resp.json()["date"] == datetime.date.today().isoformat()


def test_create_expense_drops_zero_and_negative_splits(client):
    payload = {
        "title": "Trip snacks",
        "payerId": "m1",
        "splits": [
            {"personId": "m1", "amount": 20.00},
            {"personId": "m2", "amount": 0},
        ],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["amount"] == 20.00
    assert [s["personId"] for s in body["splits"]] == ["m1"]


def test_create_expense_requires_title(client):
    payload = {
        "title": "   ",
        "payerId": "m1",
        "splits": [{"personId": "m1", "amount": 10.00}],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 400
    assert "description" in resp.json()["message"]


def test_create_expense_requires_at_least_one_positive_share(client):
    payload = {
        "title": "Nothing",
        "payerId": "m1",
        "splits": [{"personId": "m1", "amount": 0}],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 400


def test_create_expense_rejects_negative_split_amount(client):
    payload = {
        "title": "Bad split",
        "payerId": "m1",
        "splits": [{"personId": "m1", "amount": -5}],
    }
    resp = client.post("/api/expenses", json=payload)
    assert resp.status_code == 422
