import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockConsoleMethod = (method: 'log' | 'warn' | 'error' | 'info') => {
  const originalMethod = console[method];
  const mockFn = vi.fn();
  console[method] = mockFn;
  return {
    mock: mockFn,
    restore: () => {
      console[method] = originalMethod;
    },
  };
};
