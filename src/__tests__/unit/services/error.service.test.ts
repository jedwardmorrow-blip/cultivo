import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorService, ErrorType } from '@/services/error.service';
import { notificationService } from '@/services/notification.service';

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('errorService', () => {
  beforeEach(() => {
    errorService.clearErrorLog();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Test error');
      expect(result.originalError).toBe(error);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle string errors', () => {
      const result = errorService.handle('String error', { silent: true });

      expect(result.message).toBe('String error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Object error' };
      const result = errorService.handle(error, { silent: true });

      expect(result.message).toBe('Object error');
    });

    it('should include operation context', () => {
      const result = errorService.handle(new Error('Test'), { operation: 'fetchData', silent: true });

      expect(result.operation).toBe('fetchData');
    });

    it('should include metadata', () => {
      const metadata = { userId: '123', action: 'delete' };
      const result = errorService.handle(new Error('Test'), { metadata, silent: true });

      expect(result.metadata).toEqual(metadata);
    });

    it('should not show notification when silent is true', () => {
      errorService.handle(new Error('Test'), { silent: true });

      expect(notificationService.error).not.toHaveBeenCalled();
    });

    it('should show notification by default', () => {
      errorService.handle(new Error('Test error'), 'Test Operation');

      expect(notificationService.error).toHaveBeenCalledWith(
        'Test Operation: Test error',
        'Error'
      );
    });

    it('should not show notification when showNotification is false', () => {
      errorService.handle(new Error('Test'), { showNotification: false });

      expect(notificationService.error).not.toHaveBeenCalled();
    });
  });

  describe('categorizeError', () => {
    it('should categorize database errors', () => {
      const error = { code: 'PGRST200', message: 'Database error' };
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.DATABASE);
    });

    it('should categorize permission errors', () => {
      const error = { code: 'PGRST301', message: 'permission denied' };
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.PERMISSION);
    });

    it('should categorize not found errors', () => {
      const error = { code: '42P01', message: 'relation does not exist' };
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should categorize timeout errors', () => {
      const error = new Error('Request timeout occurred');
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.TIMEOUT);
    });

    it('should categorize network errors', () => {
      const error = new Error('network request failed');
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should categorize validation errors', () => {
      const error = new Error('validation failed for field');
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.VALIDATION);
    });

    it('should default to unknown error type', () => {
      const error = new Error('Some random error');
      const result = errorService.handle(error, { silent: true });

      expect(result.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('error log management', () => {
    it('should store errors in log', () => {
      errorService.handle(new Error('Error 1'), { silent: true });
      errorService.handle(new Error('Error 2'), { silent: true });

      const recentErrors = errorService.getRecentErrors(2);
      expect(recentErrors).toHaveLength(2);
      expect(recentErrors[0].message).toBe('Error 1');
      expect(recentErrors[1].message).toBe('Error 2');
    });

    it('should retrieve recent errors', () => {
      for (let i = 1; i <= 5; i++) {
        errorService.handle(new Error(`Error ${i}`), { silent: true });
      }

      const recent = errorService.getRecentErrors(3);
      expect(recent).toHaveLength(3);
      expect(recent[2].message).toBe('Error 5');
    });

    it('should filter errors by type', () => {
      errorService.handle({ code: 'PGRST200' }, { silent: true });
      errorService.handle({ code: 'PGRST301' }, { silent: true });
      errorService.handle({ code: 'PGRST200' }, { silent: true });

      const dbErrors = errorService.getErrorsByType(ErrorType.DATABASE);
      expect(dbErrors).toHaveLength(2);
    });

    it('should clear error log', () => {
      errorService.handle(new Error('Test'), { silent: true });
      expect(errorService.getRecentErrors()).toHaveLength(1);

      errorService.clearErrorLog();
      expect(errorService.getRecentErrors()).toHaveLength(0);
    });

    it('should export errors as JSON', () => {
      errorService.handle(new Error('Test error'), { silent: true });

      const exported = errorService.exportErrors();
      expect(exported).toContain('Test error');
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await errorService.retryOperation(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');

      const result = await errorService.retryOperation(operation, {
        maxRetries: 2,
        delayMs: 10,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        errorService.retryOperation(operation, {
          maxRetries: 2,
          delayMs: 10,
        })
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      await errorService.retryOperation(operation, {
        maxRetries: 2,
        delayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should use exponential backoff when enabled', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const delays: number[] = [];
      const onRetry = vi.fn((attempt) => delays.push(attempt));

      await errorService.retryOperation(operation, {
        maxRetries: 3,
        delayMs: 100,
        backoff: true,
        onRetry,
      });

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('logging methods', () => {
    it('should log messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      errorService.log('Test message', { data: 'test' });

      consoleSpy.mockRestore();
    });

    it('should warn messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      errorService.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should debug messages', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      errorService.debug('Debug message');

      consoleSpy.mockRestore();
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error object', () => {
      const result = errorService.handle(new Error('Error message'), { silent: true });
      expect(result.message).toBe('Error message');
    });

    it('should extract message from object with message property', () => {
      const result = errorService.handle({ message: 'Custom message' }, { silent: true });
      expect(result.message).toBe('Custom message');
    });

    it('should extract error property', () => {
      const result = errorService.handle({ error: 'Error text' }, { silent: true });
      expect(result.message).toBe('Error text');
    });

    it('should extract details property', () => {
      const result = errorService.handle({ details: 'Error details' }, { silent: true });
      expect(result.message).toBe('Error details');
    });

    it('should use default message for unknown error types', () => {
      const result = errorService.handle({ unknown: 'prop' }, { silent: true });
      expect(result.message).toBe('An unexpected error occurred');
    });
  });
});
