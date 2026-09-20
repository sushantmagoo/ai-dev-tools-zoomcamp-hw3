"""SQLite (what backend/tests/ uses) doesn't enforce foreign keys by
default, so a bad member id in an expense silently "succeeds" there. Real
Postgres does enforce them — this documents what actually happens today.

Confirmed by hand against a running dev stack before writing this:
POST /api/expenses with a nonexistent payerId returns a raw, unhandled
'500 Internal Server Error' (an uncaught psycopg2 IntegrityError), not a
clean 400 like every other validation failure in this API.
"""
import pytest


@pytest.mark.xfail(
    reason="crud.create_expense doesn't validate member ids exist before "
    "inserting; Postgres's FK constraint then raises an IntegrityError "
    "main.py has no handler for, so it surfaces as a raw 500 instead of "
    "the clean 400 every other validation failure gets. Only visible "
    "against a real DB — SQLite (backend/tests/) doesn't enforce FKs, "
    "so it doesn't even error there. Remove this xfail once crud.py "
    "validates ids up front.",
    strict=True,
)
def test_create_expense_with_unknown_payer_is_a_clean_400(client):
    resp = client.post(
        "/api/expenses",
        json={
            "title": "ghost payer",
            "payerId": "does-not-exist",
            "splits": [{"personId": "m1", "amount": 10}],
        },
    )
    assert resp.status_code == 400


@pytest.mark.xfail(
    reason="Same underlying gap as test_create_expense_with_unknown_payer_is_a_clean_400, "
    "for a split's personId instead of the payerId.",
    strict=True,
)
def test_create_expense_with_unknown_split_person_is_a_clean_400(client):
    resp = client.post(
        "/api/expenses",
        json={
            "title": "ghost split",
            "payerId": "m1",
            "splits": [{"personId": "does-not-exist", "amount": 10}],
        },
    )
    assert resp.status_code == 400
