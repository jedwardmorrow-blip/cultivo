import { useState } from 'react';
import { validateDate, getDateInputConstraints } from '@/lib/utils';

interface OrderDeliveryDateProps {
  orderId: string;
  deliveryDate: string | null;
  onUpdate: (orderId: string, newDate: string) => Promise<void>;
}

export function OrderDeliveryDate({ orderId, deliveryDate, onUpdate }: OrderDeliveryDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-center relative">
      <div className="text-xs text-cult-text-muted uppercase tracking-wider mb-1">Delivery Date</div>
      <div className="flex items-center gap-2 px-3 py-2 border-2 border-cult-border bg-cult-surface hover:border-cult-success transition-all">
        <input
          type="date"
          value={isEditing ? tempDate : (deliveryDate || '')}
          onFocus={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setTempDate(deliveryDate || '');
            setError(null);
          }}
          onChange={(e) => {
            e.stopPropagation();
            const value = e.target.value;
            setTempDate(value);
            const validation = validateDate(value);
            setError(validation.isValid ? null : validation.error || 'Invalid date');
          }}
          onBlur={async (e) => {
            e.stopPropagation();
            if (tempDate && tempDate !== deliveryDate && !error) {
              await onUpdate(orderId, tempDate);
            }
            setIsEditing(false);
            setTempDate('');
            setError(null);
          }}
          onClick={(e) => e.stopPropagation()}
          min={getDateInputConstraints().min}
          max={getDateInputConstraints().max}
          className="outline-none bg-transparent text-cult-text-primary font-medium text-sm cursor-pointer"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
}
