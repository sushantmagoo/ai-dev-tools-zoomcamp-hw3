import { FRONTEND_URL, BACKEND_URL } from './helpers.js';

// Fails fast with a clear message instead of letting every test time out
// individually if the docker-compose.dev.yml stack isn't up yet.
async function waitFor(url, label, attempts = 30, delayMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet — keep polling
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(
    `${label} at ${url} never became ready.\n` +
      "Start the dev stack first: 'make docker-up-dev' (or 'make e2e' to do it for you)."
  );
}

export default async function globalSetup() {
  await waitFor(`${BACKEND_URL}/healthz`, 'Backend');
  await waitFor(FRONTEND_URL, 'Frontend');
}
