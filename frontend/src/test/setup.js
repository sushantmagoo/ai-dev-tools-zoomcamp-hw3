import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Explicit, since RTL's own auto-cleanup detection relies on `afterEach`
// being a global, which it isn't unless vitest's `globals: true` is set.
afterEach(cleanup);
