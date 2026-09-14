# Expense Splitter — Scope

## Purpose
A practice project to track and split ongoing shared household bills among roommates.

## Users
- Household with individual accounts (no password — pick your identity for now).
- Expenses/balances are tied to a specific person.

## Core mechanic: splitting & settling
- Expenses are added as they happen (one-off, e.g. groceries, dinner out) — nothing recurring.
- Splits use **fixed amounts** per person (not percentage/shares, for now).
- Settling up tracks **pairwise balances** between each two people (no group-wide debt simplification for now).
- Marking a debt as "paid" updates the pairwise balance.

## Platform & stack
- React UI only for now, backed by dummy/mock APIs.
- Real backend (likely FastAPI) to be implemented later.

## Open questions (not yet decided)
- Expense fields: description, amount, date, payer, split-among-whom?
- Currency handling — single currency assumed?
- Editing/deleting expenses after the fact — allowed?
- History view — list of all past expenses, filterable by person/date?
- How are household members added (since there's no password login)?
- Any expense categories (rent, groceries, utilities) or just a flat list?