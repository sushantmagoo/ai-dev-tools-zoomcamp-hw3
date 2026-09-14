# Expense Splitter — React source

The React + Vite frontend for the household ledger dashboard: pairwise
balances between housemates, fixed-amount splits, one-tap settling.

See the [root README](../README.md) for the full project overview, how to
run the backend, and Docker instructions.

## Run it

```bash
npm install
npm run dev
```

Requires the backend running at `http://127.0.0.1:8000` (`../backend`,
or `make backend` from the repo root) — `vite.config.js` proxies `/api/*`
requests to it.

## What's here

| Path | What it is |
| --- | --- |
| `src/App.jsx` | Dashboard shell: header, summary line, two columns, dialog mount |
| `src/components/IdentityNav.jsx` | Header bar with the "viewing as" identity picker (no auth) |
| `src/components/BalanceList.jsx` | Pairwise "owes you / you owe" rows with Mark paid |
| `src/components/ExpenseTable.jsx` | Recent expenses, with the current person's share |
| `src/components/AddExpenseDialog.jsx` | Fixed-amount split entry with remaining-to-allocate |
| `src/hooks/useLedger.js` | All data access and mutations; the only module that talks to the API |
| `src/api/httpApi.js` | The real API client — `fetch` calls to the FastAPI backend |
| `src/api/mockApi.js` | Legacy in-memory mock from before the backend existed; no longer used |
| `src/styles/classical.css` | The Classical design-system tokens and component classes (vendored) |
| `src/styles/app.css` | App layout only — no colors, type or spacing of its own |
| `design-reference/` | The original HTML design prototype, for visual reference |

## Deliberate omissions (per scope)

No recurring expenses, no percentage or share-based splits, no group-wide debt
simplification, no passwords. Splits are fixed amounts and must add up to the
total paid before an expense can be saved.
