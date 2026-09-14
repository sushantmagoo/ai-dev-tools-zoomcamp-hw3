def balance_of(client, viewer_id, other_id):
    rows = client.get(f"/api/members/{viewer_id}/balances").json()
    return next(r["amount"] for r in rows if r["person"]["id"] == other_id)


def test_settle_pair_clears_the_whole_balance(client):
    # Establish a clean, known debt: m2 owes m1 exactly 50.00.
    client.post(
        "/api/expenses",
        json={
            "title": "Concert tickets",
            "payerId": "m1",
            "splits": [
                {"personId": "m1", "amount": 50.00},
                {"personId": "m2", "amount": 50.00},
            ],
        },
    )
    before = balance_of(client, "m1", "m2")
    assert before > 0  # m2 owes m1

    resp = client.post("/api/settlements", json={"fromId": "m2", "toId": "m1"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["fromId"] == "m2"
    assert body["toId"] == "m1"
    assert body["amount"] == before

    after = balance_of(client, "m1", "m2")
    assert after == 0


def test_settling_an_already_settled_pair_fails(client):
    owed = balance_of(client, "m1", "m3")
    assert owed != 0
    from_id, to_id = ("m3", "m1") if owed > 0 else ("m1", "m3")

    first = client.post("/api/settlements", json={"fromId": from_id, "toId": to_id})
    assert first.status_code == 201
    assert balance_of(client, "m1", "m3") == 0

    resp = client.post("/api/settlements", json={"fromId": from_id, "toId": to_id})
    assert resp.status_code == 400
    assert resp.json()["message"] == "Nothing outstanding between these two."


def test_settling_the_wrong_direction_of_a_debt_fails(client):
    owed = balance_of(client, "m1", "m3")
    assert owed != 0
    # Whoever is actually owed can't be settled as if they were the debtor.
    creditor, debtor = ("m1", "m3") if owed > 0 else ("m3", "m1")

    resp = client.post("/api/settlements", json={"fromId": creditor, "toId": debtor})
    assert resp.status_code == 400
    assert resp.json()["message"] == "Nothing outstanding between these two."


def test_settlement_appears_reflected_for_both_parties(client):
    client.post(
        "/api/expenses",
        json={
            "title": "Utilities",
            "payerId": "m3",
            "splits": [
                {"personId": "m3", "amount": 20.00},
                {"personId": "m4", "amount": 20.00},
            ],
        },
    )
    client.post("/api/settlements", json={"fromId": "m4", "toId": "m3"})
    assert balance_of(client, "m3", "m4") == 0
    assert balance_of(client, "m4", "m3") == 0
