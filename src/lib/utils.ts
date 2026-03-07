import { lazy, ComponentType } from 'react';

type ModuleWithDefault = { default: ComponentType<any> };

export function lazyRetry<T extends Record<string, ComponentType<any>>>(
  importFn: () => Promise<T>,
  namedExport: keyof T
) {
  return lazy(() => {
    const sessionKey = `chunk_retry_${String(namedExport)}`;
    const hasRefreshed = sessionStorage.getItem(sessionKey) === 'true';

    return (importFn() as Promise<T>)
      .then((module) => {
        sessionStorage.removeItem(sessionKey);
        return { default: module[namedExport] } as ModuleWithDefault;
      })
      .catch((error: Error) => {
        if (!hasRefreshed) {
          sessionStorage.setItem(sessionKey, 'true');
          window.location.reload();
          return new Promise<ModuleWithDefault>(() => {});
        }
        throw error;
      });
  });
}

export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const origin = window.location.origin;
  if (origin.includes('webcontainer') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    console.warn('[getSiteUrl] No VITE_PUBLIC_SITE_URL configured. Using dev origin for URLs — QR codes and public links will not work in production.');
  }
  return origin;
}

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
