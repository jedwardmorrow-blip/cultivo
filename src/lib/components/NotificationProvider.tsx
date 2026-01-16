import { useState, useEffect, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { notificationService, NotificationOptions } from '../../services';

interface ToastProps {
  notification: NotificationOptions;
  onClose: () => void;
}

function Toast({ notification, onClose }: ToastProps) {
  const { type, title, message } = notification;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-900/90 border-green-600 text-green-100',
    error: 'bg-red-900/90 border-red-600 text-red-100',
    warning: 'bg-amber-900/90 border-amber-600 text-amber-100',
    info: 'bg-blue-900/90 border-blue-600 text-blue-100',
  };

  return (
    <div className={`${colors[type]} border-2 rounded-lg shadow-xl p-4 min-w-[320px] max-w-md backdrop-blur-sm animate-fade-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-bold text-sm mb-1">{title}</div>
          )}
          <div className="text-sm">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Array<NotificationOptions & { id: number }>>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { ...notification, id }]);

      if (notification.duration) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, notification.duration);
      }
    });

    return unsubscribe;
  }, []);

  const handleClose = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {notifications.map(notification => (
            <Toast
              key={notification.id}
              notification={notification}
              onClose={() => handleClose(notification.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
