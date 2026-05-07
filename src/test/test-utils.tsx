import '@testing-library/jest-dom';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Custom render that wraps components with any providers if needed.
 * Currently a pass-through, but allows easy extension later.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options });
}

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render with our custom wrapper
export { customRender as render };
