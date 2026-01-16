type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

type NotificationListener = (notification: NotificationOptions) => void;

class NotificationService {
  private listeners: NotificationListener[] = [];

  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(options: NotificationOptions) {
    this.listeners.forEach(listener => listener(options));
  }

  success(message: string, title?: string, duration: number = 5000) {
    this.notify({ type: 'success', message, title, duration });
  }

  error(message: string, title?: string, duration: number = 7000) {
    this.notify({ type: 'error', message, title, duration });
  }

  warning(message: string, title?: string, duration: number = 6000) {
    this.notify({ type: 'warning', message, title, duration });
  }

  info(message: string, title?: string, duration: number = 5000) {
    this.notify({ type: 'info', message, title, duration });
  }
}

export const notificationService = new NotificationService();
