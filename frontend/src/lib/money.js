export const CURRENCY = '$';

export const money = n => CURRENCY + Math.abs(n).toFixed(2);

export const shortDate = iso =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
