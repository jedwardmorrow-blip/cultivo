export function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function validateDate(dateString: string): { isValid: boolean; error?: string } {
  if (!dateString) {
    return { isValid: true };
  }

  const date = new Date(dateString);
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (year < 2020 || year > currentYear + 10) {
    return { isValid: false, error: `Year must be between 2020 and ${currentYear + 10}` };
  }

  return { isValid: true };
}

export function getDateInputConstraints() {
  const currentYear = new Date().getFullYear();
  return {
    min: '2020-01-01',
    max: `${currentYear + 10}-12-31`
  };
}
