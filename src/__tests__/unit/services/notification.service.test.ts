import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService, NotificationOptions } from '@/services/notification.service';

describe('notificationService', () => {
  let receivedNotifications: NotificationOptions[] = [];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    receivedNotifications = [];
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  describe('subscribe', () => {
    it('should allow subscribing to notifications', () => {
      const listener = vi.fn();
      unsubscribe = notificationService.subscribe(listener);

      notificationService.success('Test message');

      expect(listener).toHaveBeenCalledWith({
        type: 'success',
        message: 'Test message',
        title: undefined,
        duration: 5000,
      });
    });

    it('should allow multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = notificationService.subscribe(listener1);
      const unsub2 = notificationService.subscribe(listener2);

      notificationService.info('Test message');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = notificationService.subscribe(listener);

      unsub();

      notificationService.success('Test message');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should properly remove specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = notificationService.subscribe(listener1);
      notificationService.subscribe(listener2);

      unsub1();

      notificationService.error('Test message');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should send success notification', () => {
      notificationService.success('Operation completed');

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0]).toMatchObject({
        type: 'success',
        message: 'Operation completed',
        duration: 5000,
      });
    });

    it('should accept optional title', () => {
      notificationService.success('Message', 'Success Title');

      expect(receivedNotifications[0].title).toBe('Success Title');
    });

    it('should accept custom duration', () => {
      notificationService.success('Message', 'Title', 3000);

      expect(receivedNotifications[0].duration).toBe(3000);
    });

    it('should use default duration when not provided', () => {
      notificationService.success('Message');

      expect(receivedNotifications[0].duration).toBe(5000);
    });
  });

  describe('error', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should send error notification', () => {
      notificationService.error('An error occurred');

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0]).toMatchObject({
        type: 'error',
        message: 'An error occurred',
        duration: 7000,
      });
    });

    it('should accept optional title', () => {
      notificationService.error('Message', 'Error Title');

      expect(receivedNotifications[0].title).toBe('Error Title');
    });

    it('should accept custom duration', () => {
      notificationService.error('Message', 'Title', 10000);

      expect(receivedNotifications[0].duration).toBe(10000);
    });

    it('should use default error duration', () => {
      notificationService.error('Message');

      expect(receivedNotifications[0].duration).toBe(7000);
    });
  });

  describe('warning', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should send warning notification', () => {
      notificationService.warning('Warning message');

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
        duration: 6000,
      });
    });

    it('should accept optional title', () => {
      notificationService.warning('Message', 'Warning Title');

      expect(receivedNotifications[0].title).toBe('Warning Title');
    });

    it('should accept custom duration', () => {
      notificationService.warning('Message', 'Title', 4000);

      expect(receivedNotifications[0].duration).toBe(4000);
    });
  });

  describe('info', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should send info notification', () => {
      notificationService.info('Information message');

      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0]).toMatchObject({
        type: 'info',
        message: 'Information message',
        duration: 5000,
      });
    });

    it('should accept optional title', () => {
      notificationService.info('Message', 'Info Title');

      expect(receivedNotifications[0].title).toBe('Info Title');
    });

    it('should accept custom duration', () => {
      notificationService.info('Message', 'Title', 8000);

      expect(receivedNotifications[0].duration).toBe(8000);
    });
  });

  describe('notification types', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should distinguish between notification types', () => {
      notificationService.success('Success');
      notificationService.error('Error');
      notificationService.warning('Warning');
      notificationService.info('Info');

      expect(receivedNotifications).toHaveLength(4);
      expect(receivedNotifications[0].type).toBe('success');
      expect(receivedNotifications[1].type).toBe('error');
      expect(receivedNotifications[2].type).toBe('warning');
      expect(receivedNotifications[3].type).toBe('info');
    });
  });

  describe('multiple notifications', () => {
    beforeEach(() => {
      unsubscribe = notificationService.subscribe((notification) => {
        receivedNotifications.push(notification);
      });
    });

    it('should handle multiple sequential notifications', () => {
      notificationService.success('First');
      notificationService.error('Second');
      notificationService.info('Third');

      expect(receivedNotifications).toHaveLength(3);
      expect(receivedNotifications[0].message).toBe('First');
      expect(receivedNotifications[1].message).toBe('Second');
      expect(receivedNotifications[2].message).toBe('Third');
    });
  });
});
