// Mock API for the expense splitter. In-memory store + simulated latency.
// Swap these five functions for fetch() calls when the FastAPI backend lands.

const LATENCY = [180, 420];
const wait = () => new Promise(r => setTimeout(r, LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])));
const uid = p => p + '_' + Math.random().toString(36).slice(2, 8);

const db = {
  members: [
    { id: 'm1', name: 'Iris Calloway', short: 'Iris', initials: 'IC' },
    { id: 'm2', name: 'Tobias Renn', short: 'Tobias', initials: 'TR' },
    { id: 'm3', name: 'Maren Holt', short: 'Maren', initials: 'MH' },
    { id: 'm4', name: 'Felix Adeyemi', short: 'Felix', initials: 'FA' }
  ],
  expenses: [
    { id: 'e1', title: 'Weekly groceries', payerId: 'm1', amount: 128.40, date: '2026-09-11',
      splits: [{ personId: 'm1', amount: 32.10 }, { personId: 'm2', amount: 32.10 }, { personId: 'm3', amount: 32.10 }, { personId: 'm4', amount: 32.10 }] },
    { id: 'e2', title: 'Dinner at Olio', payerId: 'm2', amount: 96.00, date: '2026-09-09',
      splits: [{ personId: 'm1', amount: 38.00 }, { personId: 'm2', amount: 24.00 }, { personId: 'm4', amount: 34.00 }] },
    { id: 'e3', title: 'Dish soap, bin bags, bulbs', payerId: 'm3', amount: 41.75, date: '2026-09-07',
      splits: [{ personId: 'm1', amount: 10.45 }, { personId: 'm2', amount: 10.45 }, { personId: 'm3', amount: 10.40 }, { personId: 'm4', amount: 10.45 }] },
    { id: 'e4', title: 'Plumber — kitchen tap', payerId: 'm1', amount: 180.00, date: '2026-09-04',
      splits: [{ personId: 'm1', amount: 45.00 }, { personId: 'm2', amount: 45.00 }, { personId: 'm3', amount: 45.00 }, { personId: 'm4', amount: 45.00 }] },
    { id: 'e5', title: 'Coffee beans', payerId: 'm4', amount: 34.00, date: '2026-09-02',
      splits: [{ personId: 'm1', amount: 17.00 }, { personId: 'm4', amount: 17.00 }] }
  ],
  settlements: [
    { id: 's1', fromId: 'm3', toId: 'm1', amount: 45.00, date: '2026-09-06' }
  ]
};

const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const round = n => Math.round(n * 100) / 100;

// net[key(a,b)] > 0 means the alphabetically-later id owes the earlier one.
function netLedger() {
  const net = {};
  const credit = (creditor, debtor, amt) => {
    const k = key(creditor, debtor);
    const sign = creditor < debtor ? 1 : -1;
    net[k] = round((net[k] || 0) + sign * amt);
  };
  for (const e of db.expenses) {
    for (const s of e.splits) {
      if (s.personId !== e.payerId && s.amount > 0) credit(e.payerId, s.personId, s.amount);
    }
  }
  for (const s of db.settlements) credit(s.toId, s.fromId, -s.amount);
  return net;
}

export async function getMembers() {
  await wait();
  return db.members.map(m => ({ ...m }));
}

// Pairwise rows for one person. amount > 0 => the other person owes them.
export async function getBalances(personId) {
  await wait();
  const net = netLedger();
  return db.members.filter(m => m.id !== personId).map(m => {
    const k = key(personId, m.id);
    const raw = net[k] || 0;
    const amount = personId < m.id ? raw : -raw;
    return { person: { ...m }, amount: round(amount) };
  });
}

export async function getExpenses() {
  await wait();
  return db.expenses.map(e => ({ ...e, splits: e.splits.map(s => ({ ...s })) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createExpense({ title, payerId, splits, date }) {
  await wait();
  const clean = splits.filter(s => s.amount > 0);
  if (!title || !clean.length) throw new Error('An expense needs a description and at least one share.');
  const amount = round(clean.reduce((t, s) => t + s.amount, 0));
  const expense = { id: uid('e'), title, payerId, amount, date: date || new Date().toISOString().slice(0, 10), splits: clean };
  db.expenses.push(expense);
  return { ...expense };
}

// Clears the whole outstanding balance between two people in one step.
export async function settlePair(fromId, toId) {
  await wait();
  const net = netLedger();
  const k = key(fromId, toId);
  const raw = net[k] || 0;
  const owed = fromId < toId ? -raw : raw; // what fromId owes toId
  if (round(owed) <= 0) throw new Error('Nothing outstanding between these two.');
  const settlement = { id: uid('s'), fromId, toId, amount: round(owed), date: new Date().toISOString().slice(0, 10) };
  db.settlements.push(settlement);
  return { ...settlement };
}
