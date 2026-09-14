def test_list_members_returns_seeded_members(client):
    resp = client.get("/api/members")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 4
    assert {m["id"] for m in body} == {"m1", "m2", "m3", "m4"}
    for m in body:
        assert set(m.keys()) == {"id", "name", "short", "initials"}


def test_balances_has_one_row_per_other_member(client):
    resp = client.get("/api/members/m1/balances")
    assert resp.status_code == 200
    body = resp.json()
    other_ids = {row["person"]["id"] for row in body}
    assert other_ids == {"m2", "m3", "m4"}


def test_balances_are_antisymmetric_between_a_pair(client):
    rows_m1 = {r["person"]["id"]: r["amount"] for r in client.get("/api/members/m1/balances").json()}
    rows_m2 = {r["person"]["id"]: r["amount"] for r in client.get("/api/members/m2/balances").json()}
    assert rows_m1["m2"] == -rows_m2["m1"]


def test_balances_for_unknown_member_is_404(client):
    resp = client.get("/api/members/does-not-exist/balances")
    assert resp.status_code == 404
    assert "message" in resp.json() or "detail" in resp.json()
