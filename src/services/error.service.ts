import { notificationService } from './notification.service';

export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  CONSTRAINT = 'CONSTRAINT',
  AUTH = 'AUTH',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorContext {
  operation?: string;
  metadata?: Record<string, unknown>;
  silent?: boolean;
  showNotification?: boolean;
}

export interface StructuredError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  timestamp: Date;
  operation?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

class ErrorService {
  private errorLog: StructuredError[] = [];
  private maxLogSize = 100;
  private isDebugMode = import.meta.env.DEV;
  private authErrorShownAt = 0;
  private static AUTH_DEDUP_WINDOW_MS = 5000;

  handle(error: unknown, context?: string | ErrorContext): StructuredError {
    const errorMessage = this.extractErrorMessage(error);
    const errorType = this.categorizeError(error);
    const operation = typeof context === 'string' ? context : context?.operation;
    const silent = typeof context === 'object' && context.silent;
    const showNotification = typeof context === 'object' ? context.showNotification !== false : true;

    const structuredError: StructuredError = {
      type: errorType,
      message: errorMessage,
      originalError: error,
      timestamp: new Date(),
      operation,
      metadata: typeof context === 'object' ? context.metadata : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    };

    this.logError(structuredError);

    if (!silent) {
      this.consoleError(structuredError);
    }

    if (showNotification && !silent) {
      if (errorType === ErrorType.AUTH) {
        const now = Date.now();
        if (now - this.authErrorShownAt > ErrorService.AUTH_DEDUP_WINDOW_MS) {
          this.authErrorShownAt = now;
          notificationService.error('Your session has expired. Please sign in again.', 'Session Expired');
        }
      } else {
        const displayMessage = this.formatUserMessage(errorMessage, operation);
        notificationService.error(displayMessage, this.getErrorTitle(errorType));
      }
    }

    return structuredError;
  }

  private logError(error: StructuredError) {
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  private consoleError(error: StructuredError) {
    const prefix = `[${error.type}${error.operation ? ` - ${error.operation}` : ''}]`;
    console.error(prefix, error.message);

    if (this.isDebugMode) {
      console.error('Error Details:', {
        type: error.type,
        timestamp: error.timestamp,
        metadata: error.metadata,
        originalError: error.originalError,
      });
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }

  categorizeError(error: unknown): ErrorType {
    if (typeof error === 'object' && error !== null) {
      const err = error as any;

      if (
        err.code === '23514' ||
        err.code === '23505' ||
        err.code === '23503' ||
        err.code === '23502' ||
        err.message?.includes('violates check constraint') ||
        err.message?.includes('violates unique constraint') ||
        err.message?.includes('violates foreign key constraint') ||
        err.message?.includes('violates not-null constraint') ||
        err.message?.includes('new row violates')
      ) {
        return ErrorType.CONSTRAINT;
      }
      if (
        err.message?.includes('JWT expired') ||
        err.message?.includes('token is expired') ||
        err.message?.includes('invalid claim: missing sub claim') ||
        err.code === 'PGRST301' && err.message?.includes('expired') ||
        err.status === 401 ||
        err.code === 'session_not_found'
      ) {
        return ErrorType.AUTH;
      }
      if (err.code === 'PGRST200' || err.message?.includes('schema cache')) {
        return ErrorType.DATABASE;
      }
      if (err.code === 'PGRST301' || err.message?.includes('permission denied')) {
        return ErrorType.PERMISSION;
      }
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        return ErrorType.NOT_FOUND;
      }
      if (err.message?.includes('timeout') || err.message?.includes('took too long')) {
        return ErrorType.TIMEOUT;
      }
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        return ErrorType.NETWORK;
      }
      if (err.message?.includes('validation') || err.message?.includes('invalid')) {
        return ErrorType.VALIDATION;
      }
    }

    return ErrorType.UNKNOWN;
  }

  private getErrorTitle(type: ErrorType): string {
    const titles: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Network Error',
      [ErrorType.DATABASE]: 'Database Error',
      [ErrorType.PERMISSION]: 'Permission Denied',
      [ErrorType.VALIDATION]: 'Validation Error',
      [ErrorType.NOT_FOUND]: 'Not Found',
      [ErrorType.TIMEOUT]: 'Request Timeout',
      [ErrorType.CONSTRAINT]: 'Constraint Violation',
      [ErrorType.AUTH]: 'Session Expired',
      [ErrorType.UNKNOWN]: 'Error',
    };
    return titles[type] || 'Error';
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }
      if ('details' in error && typeof error.details === 'string') {
        return error.details;
      }
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred';
  }

  private formatUserMessage(errorMessage: string, operation?: string): string {
    if (operation) {
      return `${operation}: ${errorMessage}`;
    }
    return errorMessage;
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      delayMs?: number;
      backoff?: boolean;
      onRetry?: (attempt: number, error: unknown) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delayMs = 1000,
      backoff = true,
      onRetry
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;

          if (onRetry) {
            onRetry(attempt + 1, error);
          }

          this.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  getRecentErrors(count: number = 10): StructuredError[] {
    return this.errorLog.slice(-count);
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  getErrorsByType(type: ErrorType): StructuredError[] {
    return this.errorLog.filter(err => err.type === type);
  }

  exportErrors(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  log(message: string, data?: unknown) {
    if (this.isDebugMode) {
      console.log(`[Log]: ${message}`, data || '');
    }
  }

  warn(message: string, data?: unknown) {
    console.warn(`[Warning]: ${message}`, data || '');
  }

  debug(message: string, data?: unknown) {
    if (this.isDebugMode) {
      console.debug(`[Debug]: ${message}`, data || '');
    }
  }
}

export const errorService = new ErrorService();

if (typeof window !== 'undefined') {
  (window as any).__errorService = errorService;
}
