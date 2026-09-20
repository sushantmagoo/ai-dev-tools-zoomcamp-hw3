"""Regression net for storing/reading amounts through a real Postgres
DOUBLE PRECISION column (SQLAlchemy's Float maps to it on Postgres), not
SQLite's dynamic typing. Expected to pass — Python floats and Postgres's
double precision are both IEEE-754 doubles, so this round-trip should be
lossless — but it's exactly the kind of thing that's cheap to assert here
and expensive to debug in production if a future change (a different
column type, a driver upgrade) ever makes it not true.
"""


def test_uneven_three_way_split_round_trips_exactly_through_postgres(client):
    resp = client.post(
        "/api/expenses",
        json={
            "title": "Taxi split three ways",
            "payerId": "m1",
            "splits": [
                {"personId": "m1", "amount": 3.33},
                {"personId": "m2", "amount": 3.33},
                {"personId": "m3", "amount": 3.34},
            ],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["amount"] == 10.00

    fetched = next(e for e in client.get("/api/expenses").json() if e["id"] == body["id"])
    amounts = {s["personId"]: s["amount"] for s in fetched["splits"]}
    assert amounts == {"m1": 3.33, "m2": 3.33, "m3": 3.34}
    assert fetched["amount"] == 10.00


def test_many_small_splits_do_not_drift(client):
    # Seven $0.10 splits across the four members doesn't divide evenly in
    # binary floating point (0.1 isn't exact) — this is the case most
    # likely to reveal drift introduced by a round trip through a real
    # database column, if there were any.
    members = ["m1", "m2", "m3", "m4", "m1", "m2", "m3"]
    splits = [{"personId": pid, "amount": 0.10} for pid in members]
    resp = client.post("/api/expenses", json={"title": "Vending machine", "payerId": "m1", "splits": splits})
    assert resp.status_code == 201
    assert resp.json()["amount"] == 0.70
