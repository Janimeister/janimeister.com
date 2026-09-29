import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Contains render errors (including rejected `use()` promises and failed lazy
 * chunks) to one part of the page. Remount with a new `key` to retry.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Section failed to render:', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
