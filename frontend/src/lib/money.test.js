import { describe, expect, it } from 'vitest';
import { money, shortDate } from './money.js';

describe('money', () => {
  it('formats a positive amount with a dollar sign and two decimals', () => {
    expect(money(32.1)).toBe('$32.10');
  });

  it('formats a negative amount using its absolute value', () => {
    expect(money(-45)).toBe('$45.00');
  });

  it('formats zero', () => {
    expect(money(0)).toBe('$0.00');
  });
});

describe('shortDate', () => {
  it('formats an ISO date as an abbreviated month and day', () => {
    expect(shortDate('2026-09-11')).toBe('Sep 11');
  });

  it('is not shifted by the viewer timezone (parses as local midnight)', () => {
    expect(shortDate('2026-01-01')).toBe('Jan 1');
  });
});
