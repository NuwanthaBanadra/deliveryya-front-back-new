export const formatLkr = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'LKR 0.00';
  }

  return `LKR ${amount.toFixed(2)}`;
};

export const parseCurrencyToNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};