'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Users, Hash, Eye, Pencil, Trash2, MoreVertical, ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import type { Room } from '@/services/rooms.service';

export type RoomStatus = NonNullable<Room['status']>;

/**
 * Shared so the table, the grid card and the detail modal agree on one status
 * colour. `inactive` and `locked` fall through to the neutral variant — they are
 * not distinguished yet, and adding a colour here is an art-direction call.
 */
export function roomStatusVariant(status?: RoomStatus): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'closed') return 'default';
  return 'default';
}

export function roomName(room?: Room | null): string {
  if (!room) return 'Unnamed Room';
  return room.name?.en || room.name?.ar || 'Unnamed Room';
}

/**
 * profileImageUrl with an initial-letter fallback. A rejected or missing image
 * degrades to a letter — the row never renders a blank avatar. Tracking the
 * failed URL (not a boolean) self-corrects when an admin fixes a broken link.
 */
export function RoomThumbnail({ room, className = '' }: { room: Room; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = room.profileImageUrl ?? null;
  const showImage = Boolean(src) && failedUrl !== src;
  const name = roomName(room);
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          onError={() => setFailedUrl(src)}
          className="h-full w-full object-cover"
        />
      ) : initial ? (
        <span aria-hidden="true">{initial}</span>
      ) : (
        <ImageIcon className="h-5 w-5 opacity-70" />
      )}
    </div>
  );
}

export interface RoomActionItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Overflow row actions. The actions expand inline rather than in a popover:
 * both hosts clip an absolutely-positioned menu (DataTable's `overflow-x-auto`
 * wrapper and the card's `overflow-hidden` + hover transform), so a floating
 * menu would be cut off on the last rows. Inline expansion also needs no
 * portal, no z-index negotiation and no outside-click plumbing.
 */
export function RoomActionsMenu({ items, label = 'Room actions' }: { items: RoomActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (items.length === 0) return null;

  if (open) {
    return (
      <div className="flex items-center justify-end gap-1">
        {items.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            aria-label={item.label}
            onClick={() => { setOpen(false); item.onSelect(); }}
            className={item.danger ? 'text-red-600 dark:text-red-400' : undefined}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      onClick={() => setOpen(true)}
      className="p-1.5"
    >
      <MoreVertical className="w-4 h-4" />
    </Button>
  );
}

interface RoomCardProps {
  room: Room;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoomCard({ room, onView, onEdit, onDelete }: RoomCardProps) {
  const items: RoomActionItem[] = [
    { label: 'View', icon: <Eye className="w-3.5 h-3.5" />, onSelect: () => onView?.() },
    ...(onEdit ? [{ label: 'Edit', icon: <Pencil className="w-3.5 h-3.5" />, onSelect: onEdit }] : []),
    ...(onDelete ? [{ label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onSelect: onDelete, danger: true }] : []),
  ];

  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      <div className="h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-white rounded-full" />
        </div>
        <div className="absolute bottom-3 left-4 text-white">
          <p className="text-xs font-medium opacity-80">Level {room.level}</p>
          <div className="flex items-center gap-1 text-2xl font-bold">
            <Hash className="w-4 h-4 opacity-80" />
            {room.roomCode}
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <RoomThumbnail room={room} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{roomName(room)}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono">{room.roomCode}</Badge>
              <span className="truncate font-mono text-[10px] text-gray-400">
                {room.publicRoomId ?? 'No public ID'}
              </span>
            </div>
          </div>
          <Badge variant={roomStatusVariant(room.status)} className="shrink-0">
            {room.status ?? 'unknown'}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-gray-400">Level</dt>
            <dd className="font-medium text-gray-700 dark:text-gray-200">{room.level}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Capacity</dt>
            <dd className="font-medium text-gray-700 dark:text-gray-200">{room.capacity ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-gray-400">Country</dt>
            <dd className="truncate font-medium text-gray-700 dark:text-gray-200">{room.country ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
          {/* memberCount is not aggregated by the admin rooms list/detail responses —
              absent renders "—", never a fabricated 0. */}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" /> {room.memberCount ?? '—'} members
          </span>
          <RoomActionsMenu items={items} label={`Actions for ${roomName(room)}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default RoomCard;
