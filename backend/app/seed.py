"""Seeds a fresh database with demo data so the frontend has something to
show. No-op if members already exist (i.e. only seeds an empty database)."""
from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from . import db_models as m


def seed_if_empty(db: Session) -> None:
    if db.query(m.Member).first() is not None:
        return

    db.add_all(
        [
            m.Member(id="m1", name="Iris Calloway", short="Iris", initials="IC"),
            m.Member(id="m2", name="Tobias Renn", short="Tobias", initials="TR"),
            m.Member(id="m3", name="Maren Holt", short="Maren", initials="MH"),
            m.Member(id="m4", name="Felix Adeyemi", short="Felix", initials="FA"),
        ]
    )
    # Flush members first so the FK-enforcing backends (e.g. Postgres) see
    # them before the expenses/settlements referencing them below insert.
    db.flush()

    def expense(id_: str, title: str, payer_id: str, on: date, splits: list[tuple[str, float]]) -> m.Expense:
        e = m.Expense(id=id_, title=title, payer_id=payer_id, date=on, amount=round(sum(a for _, a in splits), 2))
        e.splits = [m.Split(person_id=pid, amount=amt) for pid, amt in splits]
        return e

    db.add_all(
        [
            expense(
                "e1", "Weekly groceries", "m1", date(2026, 9, 11),
                [("m1", 32.10), ("m2", 32.10), ("m3", 32.10), ("m4", 32.10)],
            ),
            expense(
                "e2", "Dinner at Olio", "m2", date(2026, 9, 9),
                [("m1", 38.00), ("m2", 24.00), ("m4", 34.00)],
            ),
            expense(
                "e3", "Dish soap, bin bags, bulbs", "m3", date(2026, 9, 7),
                [("m1", 10.45), ("m2", 10.45), ("m3", 10.40), ("m4", 10.45)],
            ),
            expense(
                "e4", "Plumber — kitchen tap", "m1", date(2026, 9, 4),
                [("m1", 45.00), ("m2", 45.00), ("m3", 45.00), ("m4", 45.00)],
            ),
            expense(
                "e5", "Coffee beans", "m4", date(2026, 9, 2),
                [("m1", 17.00), ("m4", 17.00)],
            ),
        ]
    )

    db.add(m.Settlement(id="s1", from_id="m3", to_id="m1", amount=45.00, date=date(2026, 9, 6)))

    db.commit()
