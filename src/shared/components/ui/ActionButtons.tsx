'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function ActionButtons({ onEdit, onDelete, canManage = true }: ActionButtonsProps) {
  if (!canManage) return null;

  return (
    <div className="flex items-center gap-1">
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </Button>
      )}
    </div>
  );
}

export default ActionButtons;
