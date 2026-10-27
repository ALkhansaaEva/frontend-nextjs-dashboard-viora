'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

// Safe default: privileged edit/delete controls are hidden unless the caller
// explicitly proves authorization (real backend-derived permission check).
// Do not change this default back to `true`.
export function ActionButtons({ onEdit, onDelete, canManage = false }: ActionButtonsProps) {
  if (!canManage) return null;

  return (
    // These buttons live inside a clickable card on the gifts list. Without
    // stopping propagation the click also reached the card's `onClick`, which
    // opened the item details modal *behind* the delete confirmation — so
    // Delete appeared to hand off to Details. Same guard `StoreItemCard`
    // already applies to its own buttons.
    <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
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
