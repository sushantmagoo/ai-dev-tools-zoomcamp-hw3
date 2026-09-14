"""Pure pairwise-balance math, independent of storage. Operates on plain
dicts so it works the same whether the data came from SQLite, Postgres, or
(in tests) an in-memory database."""
from __future__ import annotations

from typing import Dict, List


def round2(n: float) -> float:
    return round(n, 2)


def pair_key(a: str, b: str) -> str:
    """Order-independent key for a pair of member ids."""
    return f"{a}|{b}" if a < b else f"{b}|{a}"


def net_ledger(expenses: List[dict], settlements: List[dict]) -> Dict[str, float]:
    """net[pair_key(a, b)] > 0 means the alphabetically-later id owes the
    earlier one."""
    net: Dict[str, float] = {}

    def credit(creditor: str, debtor: str, amt: float) -> None:
        k = pair_key(creditor, debtor)
        sign = 1 if creditor < debtor else -1
        net[k] = round2(net.get(k, 0.0) + sign * amt)

    for e in expenses:
        for s in e["splits"]:
            if s["personId"] != e["payerId"] and s["amount"] > 0:
                credit(e["payerId"], s["personId"], s["amount"])
    for s in settlements:
        credit(s["toId"], s["fromId"], -s["amount"])
    return net
