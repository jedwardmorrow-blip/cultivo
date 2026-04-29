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
 success: 'bg-cult-success/20 border-cult-success text-cult-text-primary',
 error: 'bg-cult-danger/20 border-cult-danger text-cult-text-primary',
 warning: 'bg-cult-warning/20 border-cult-warning text-cult-text-primary',
 info: 'bg-cult-info/20 border-cult-info text-cult-text-primary',
 };

 return (
 <div className={`${colors[type]} border-2 rounded-lg p-4 min-w-[320px] max-w-md animate-fade-in`}>
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
 <div className="fixed top-safe right-4 z-50 flex flex-col gap-2 pointer-events-none">
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
