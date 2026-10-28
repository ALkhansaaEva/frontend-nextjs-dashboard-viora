'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, Pencil, Trash2, Users, Shield, MicOff, UserX, Inbox, Globe } from 'lucide-react';
import {
  useRooms,
  useRoom,
  useRoomBans,
  useRoomMutes,
  useRoomKicks,
  useKickUser,
  useBanUser,
  useUnbanUser,
  useMuteUser,
  useUnmuteUser,
  useUpdateRoom,
  useDeleteRoom,
  useHasAnyPermission,
  useRoomRoundJoinRequests,
  useCreateRoomRound,
  useAssignPlatformRoomRole,
  useRevokePlatformRoomRole,
  type UpdateRoomInput,
} from '@/hooks';
import type { RoomRoundDto } from '@/services/rooms.service';
import { useLanguage } from '@/components/language-context';
import { useToast } from '@/store/toast.store';
import { TableSkeleton } from '@/components/skeletons';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ViewToggle } from '@/shared/components/ui/ViewToggle';
import {
  RoomCard,
  RoomActionsMenu,
  RoomThumbnail,
  roomName,
  roomStatusVariant,
  type RoomActionItem,
} from '@/shared/components/rooms/RoomCard';
import { userDisplayName, humanizeToken } from '@/shared/lib/labels';
import type { Room } from '@/services/rooms.service';

type RoomModerationAction = 'kick' | 'ban' | 'unban' | 'mute' | 'unmute';

/** Mirrors the UpdateRoomDto field limits so the browser blocks the same input the DTO would reject. */
const FIELD_LIMITS = {
  slogan: 200,
  country: 80,
  backgroundId: 120,
  themeId: 120,
  profileImageUrl: 500,
} as const;

const CAPACITY_MIN = 2;
const CAPACITY_MAX = 200;

interface RoomFormState {
  nameEn: string;
  nameAr: string;
  slogan: string;
  capacity: string;
  country: string;
  backgroundId: string;
  themeId: string;
  profileImageUrl: string;
}

function initialRoomForm(room: Room): RoomFormState {
  return {
    nameEn: room.name?.en ?? '',
    nameAr: room.name?.ar ?? '',
    slogan: room.slogan ?? '',
    capacity: room.capacity != null ? String(room.capacity) : '',
    country: room.country ?? '',
    backgroundId: room.backgroundId ?? '',
    themeId: room.themeId ?? '',
    profileImageUrl: room.profileImageUrl ?? '',
  };
}

/**
 * Builds the PATCH body from the 7 whitelisted fields only. Blank optional
 * fields are omitted (left untouched) because only `profileImageUrl` documents
 * an empty-string-clears semantic — the DTO says nothing about clearing the
 * others, so guessing one would risk wiping a value.
 */
function buildRoomPayload(form: RoomFormState): {
  payload?: UpdateRoomInput;
  error?: string;
} {
  const nameEn = form.nameEn.trim();
  const nameAr = form.nameAr.trim();
  if (!nameEn && !nameAr) {
    return { error: 'A room name is required (English or Arabic).' };
  }

  const name: Record<string, string> = {};
  if (nameEn) name.en = nameEn;
  if (nameAr) name.ar = nameAr;

  const payload: UpdateRoomInput = { name };

  const slogan = form.slogan.trim();
  if (slogan) payload.slogan = slogan;

  const capacityRaw = form.capacity.trim();
  if (capacityRaw) {
    const capacity = Number(capacityRaw);
    if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) {
      return {
        error: `Capacity must be a whole number between ${CAPACITY_MIN} and ${CAPACITY_MAX}.`,
      };
    }
    payload.capacity = capacity;
  }

  const country = form.country.trim();
  if (country) payload.country = country;

  const backgroundId = form.backgroundId.trim();
  if (backgroundId) payload.backgroundId = backgroundId;

  const themeId = form.themeId.trim();
  if (themeId) payload.themeId = themeId;

  // The one field where "" is a documented clear (`@Matches(/^$|^https?:\/\/\S+$/)`).
  const profileImageUrl = form.profileImageUrl.trim();
  if (profileImageUrl && !/^https?:\/\/\S+$/.test(profileImageUrl)) {
    return { error: 'Profile image must be an http(s) URL.' };
  }
  payload.profileImageUrl = profileImageUrl;

  return { payload };
}

function RoomEditModal({
  room,
  onClose,
  onSaved,
}: {
  room: Room;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RoomFormState>(() => initialRoomForm(room));
  const [formError, setFormError] = useState<string | null>(null);
  const updateMutation = useUpdateRoom();

  const set = useCallback(
    (key: keyof RoomFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const submit = useCallback(async () => {
    const { payload, error } = buildRoomPayload(form);
    if (error || !payload) {
      setFormError(error ?? 'The room could not be updated.');
      return;
    }
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ roomId: room.id, data: payload });
      onSaved();
    } catch {
      // Surfaced from updateMutation.error below.
    }
  }, [form, room.id, updateMutation, onSaved]);

  const previewUrl = form.profileImageUrl.trim();

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${roomName(room)}`} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          These are the only fields the rooms API accepts. Level, XP, room code, public ID, status
          and owner are not editable.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name (English)" value={form.nameEn} onChange={set('nameEn')} />
          <Input label="Name (Arabic)" value={form.nameAr} onChange={set('nameAr')} dir="rtl" />
        </div>

        <Input
          label="Slogan"
          value={form.slogan}
          onChange={set('slogan')}
          maxLength={FIELD_LIMITS.slogan}
          placeholder={`Up to ${FIELD_LIMITS.slogan} characters`}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Capacity (${CAPACITY_MIN}–${CAPACITY_MAX})`}
            type="number"
            inputMode="numeric"
            min={CAPACITY_MIN}
            max={CAPACITY_MAX}
            step={1}
            value={form.capacity}
            onChange={set('capacity')}
            placeholder="Unchanged"
          />
          <Input
            label="Country"
            icon={<Globe className="w-4 h-4" />}
            value={form.country}
            onChange={set('country')}
            maxLength={FIELD_LIMITS.country}
            placeholder="Unchanged"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Background preset ID"
            value={form.backgroundId}
            onChange={set('backgroundId')}
            maxLength={FIELD_LIMITS.backgroundId}
            placeholder="Unchanged"
          />
          <Input
            label="Theme preset ID"
            value={form.themeId}
            onChange={set('themeId')}
            maxLength={FIELD_LIMITS.themeId}
            placeholder="Unchanged"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <Input
                label="Profile image URL"
                value={form.profileImageUrl}
                onChange={set('profileImageUrl')}
                maxLength={FIELD_LIMITS.profileImageUrl}
                placeholder="https://… — leave empty and save to clear"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!form.profileImageUrl}
              onClick={() => setForm((prev) => ({ ...prev, profileImageUrl: '' }))}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-gray-500">Saving an empty value clears the stored image.</p>
          {previewUrl && /^https?:\/\/\S+$/.test(previewUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Profile image preview"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              className="h-20 w-20 rounded-xl object-cover"
            />
          )}
        </div>

        {(formError || updateMutation.error) && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError ??
              (updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'The update failed.')}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isLoading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RoomRoundsPanel({ roomId }: { roomId: string }) {
  const { data: requests = [], isLoading } = useRoomRoundJoinRequests(roomId, true);
  const createMutation = useCreateRoomRound();
  const [red, setRed] = useState<string[]>([]);
  const [blue, setBlue] = useState<string[]>([]);
  const [durationMode, setDurationMode] = useState<'SHORT_60' | 'LONG_180'>('SHORT_60');
  const [lastRound, setLastRound] = useState<RoomRoundDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const toggle = useCallback((side: 'red' | 'blue', userId: string) => {
    setFormError(null);
    setLastRound(null);
    const pick = (from: string[]) =>
      from.includes(userId) ? from.filter((id) => id !== userId) : [...from, userId];
    if (side === 'red') {
      setRed(pick);
      setBlue((prev) => prev.filter((id) => id !== userId));
    } else {
      setBlue(pick);
      setRed((prev) => prev.filter((id) => id !== userId));
    }
  }, []);

  const submit = useCallback(async () => {
    setFormError(null);
    if (red.length === 0 || blue.length === 0) {
      setFormError('Assign at least one player to each team.');
      return;
    }
    if (red.length !== blue.length) {
      setFormError('Room PK teams must have equal sizes.');
      return;
    }
    try {
      const round = await createMutation.mutateAsync({
        roomId,
        data: {
          teammateUserIds: red,
          opponentUserIds: blue,
          durationMode,
          idempotencyKey: `pk-round-${Date.now()}`,
        },
      });
      setLastRound(round);
      setRed([]);
      setBlue([]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The round could not be created.');
    }
  }, [roomId, red, blue, durationMode, createMutation]);

  const error =
    formError ?? (createMutation.error instanceof Error ? createMutation.error.message : null);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Draft the waiting list into two equal teams. Every listed player must still hold a pending
        join request and occupy an active microphone seat at request time. You are never rostered
        implicitly — add yourself from the queue only if you intend to play.
      </p>

      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 dark:border-gray-700">
        {isLoading ? (
          <p className="text-center text-gray-500 py-4 text-sm">Loading queue…</p>
        ) : requests.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">No pending join requests.</p>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
            >
              <span className="font-mono text-gray-600 dark:text-gray-400">{request.userId}</span>
              <div className="flex gap-2">
                <Button
                  variant={red.includes(request.userId) ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => toggle('red', request.userId)}
                >
                  Red
                </Button>
                <Button
                  variant={blue.includes(request.userId) ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => toggle('blue', request.userId)}
                >
                  Blue
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
            Red side (A) — {red.length}
          </p>
          {red.map((id) => (
            <button
              key={id}
              onClick={() => toggle('red', id)}
              className="block font-mono text-xs text-gray-600 hover:underline dark:text-gray-400"
            >
              {id} ✕
            </button>
          ))}
          {red.length === 0 && <p className="text-xs text-gray-500">no players</p>}
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
            Blue side (B) — {blue.length}
          </p>
          {blue.map((id) => (
            <button
              key={id}
              onClick={() => toggle('blue', id)}
              className="block font-mono text-xs text-gray-600 hover:underline dark:text-gray-400"
            >
              {id} ✕
            </button>
          ))}
          {blue.length === 0 && <p className="text-xs text-gray-500">no players</p>}
        </div>
      </div>

      <Select
        label="Round duration"
        value={durationMode}
        onChange={(event) => setDurationMode(event.target.value as 'SHORT_60' | 'LONG_180')}
        options={[
          { value: 'SHORT_60', label: 'Short — 60 seconds' },
          { value: 'LONG_180', label: 'Long — 180 seconds' },
        ]}
      />

      {(error || (createMutation.isSuccess && lastRound)) && (
        <>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {lastRound && !error && (
            <div className="text-sm p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="font-semibold text-green-700 dark:text-green-400">
                Round {lastRound.id.slice(0, 8)}… created — {humanizeToken(lastRound.state)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {lastRound.participants.length} players invited · awaiting acceptance (
                {lastRound.teamSize}v{lastRound.teamSize})
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => void submit()}
          disabled={createMutation.isPending}
          isLoading={createMutation.isPending}
        >
          Create round
        </Button>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'moderation' | 'rounds'>('members');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    action: RoomModerationAction;
    userId: string;
  } | null>(null);
  const [kickDurationType, setKickDurationType] = useState<'2h' | '12m'>('2h');
  const [muteType, setMuteType] = useState<'chat' | 'mic' | 'all'>('all');
  const [muteDurationMinutes, setMuteDurationMinutes] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const hasAnyPermission = useHasAnyPermission();
  const canManageRooms = hasAnyPermission(['rooms.write', 'manage_all_rooms']);
  const { data, isLoading, error, refetch } = useRooms({
    page,
    limit: 20,
    search,
    admin: true,
  });

  const { data: roomDetail } = useRoom(selectedRoomId || '', true);
  const members = roomDetail?.members ?? [];
  const { data: bans = [] } = useRoomBans(selectedRoomId || '', canManageRooms);
  const { data: mutes = [] } = useRoomMutes(selectedRoomId || '', canManageRooms);
  const { data: kicks = [] } = useRoomKicks(selectedRoomId || '', canManageRooms);

  const kickMutation = useKickUser();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const muteMutation = useMuteUser();
  const unmuteMutation = useUnmuteUser();
  const deleteMutation = useDeleteRoom();
  const assignPlatformRoleMutation = useAssignPlatformRoomRole();
  const revokePlatformRoleMutation = useRevokePlatformRoomRole();
  const toast = useToast();

  // Platform-assigned roles are granted only from this admin surface.
  const assignPlatformRole = useCallback(
    (userId: string) => {
      if (!selectedRoomId) return;
      assignPlatformRoleMutation.mutate(
        { roomId: selectedRoomId, userId, role: 'developer' },
        {
          onSuccess: () =>
            toast.success('Developer role granted.', 'Audited platform action.'),
          onError: (err) =>
            toast.error('Could not grant the developer role.', err),
        },
      );
    },
    [assignPlatformRoleMutation, selectedRoomId, toast],
  );

  const revokePlatformRole = useCallback(
    (userId: string) => {
      if (!selectedRoomId) return;
      revokePlatformRoleMutation.mutate(
        { roomId: selectedRoomId, userId },
        {
          onSuccess: () =>
            toast.success('Developer role revoked.', 'Audited platform action.'),
          onError: (err) =>
            toast.error('Could not revoke the developer role.', err),
        },
      );
    },
    [revokePlatformRoleMutation, selectedRoomId, toast],
  );

  const filteredRooms = useMemo(() => {
    if (!data?.data) return [];
    if (!search) return data.data;
    const searchLower = search.toLowerCase();
    return data.data.filter(
      (room) =>
        room.name?.en?.toLowerCase().includes(searchLower) ||
        room.name?.ar?.toLowerCase().includes(searchLower) ||
        room.roomCode.toLowerCase().includes(searchLower) ||
        room.publicRoomId?.toLowerCase().includes(searchLower),
    );
  }, [data, search]);

  // Filter/pagination state lives in the URL. `replace` (not `push`) keeps a
  // paged list from filling the back button with one entry per click.
  const handleSearch = useCallback(
    (query: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('search', query);
      url.searchParams.set('page', '1');
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    },
    [router],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const url = new URL(window.location.href);
      url.searchParams.set('page', newPage.toString());
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    },
    [router],
  );

  const handleViewRoom = useCallback((room: Room) => {
    setSelectedRoomId(room.id);
    setShowDetailsModal(true);
  }, []);

  // Only one modal stays mounted at a time: two stacked <Modal>s share the
  // same Escape listener, so Escape would close both at once.
  const handleEditRoom = useCallback((room: Room) => {
    setShowDetailsModal(false);
    setActiveTab('members');
    setEditingRoom(room);
  }, []);

  const roomActions = useCallback(
    (room: Room): RoomActionItem[] => {
      const items: RoomActionItem[] = [
        {
          label: 'View',
          icon: <Eye className="w-3.5 h-3.5" />,
          onSelect: () => handleViewRoom(room),
        },
      ];
      if (canManageRooms) {
        items.push({
          label: 'Edit',
          icon: <Pencil className="w-3.5 h-3.5" />,
          onSelect: () => handleEditRoom(room),
        });
        items.push({
          label: 'Delete',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          onSelect: () => setDeleteTarget(room),
          danger: true,
        });
      }
      return items;
    },
    [canManageRooms, handleEditRoom, handleViewRoom],
  );

  const openModerationAction = useCallback((action: RoomModerationAction, targetUserId: string) => {
    setActionTarget({ action, userId: targetUserId });
    setModerationReason('');
    setMuteDurationMinutes('');
    setActionError(null);
  }, []);

  const closeModerationAction = useCallback(() => {
    setActionTarget(null);
    setActionError(null);
  }, []);

  const handleModerationAction = useCallback(async () => {
    if (!selectedRoomId || !actionTarget || !canManageRooms) return;
    try {
      const common = { roomId: selectedRoomId, userId: actionTarget.userId };
      switch (actionTarget.action) {
        case 'kick':
          await kickMutation.mutateAsync({
            ...common,
            durationType: kickDurationType,
            reason: moderationReason.trim() || undefined,
          });
          break;
        case 'ban':
          await banMutation.mutateAsync({
            ...common,
            reason: moderationReason.trim() || undefined,
          });
          break;
        case 'unban':
          await unbanMutation.mutateAsync(common);
          break;
        case 'mute':
          await muteMutation.mutateAsync({
            ...common,
            muteType,
            durationMinutes: muteDurationMinutes ? Number(muteDurationMinutes) : undefined,
            reason: moderationReason.trim() || undefined,
          });
          break;
        case 'unmute':
          await unmuteMutation.mutateAsync(common);
          break;
      }
      closeModerationAction();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : `Failed to ${actionTarget.action} this member.`,
      );
    }
  }, [
    selectedRoomId,
    actionTarget,
    canManageRooms,
    kickDurationType,
    muteType,
    muteDurationMinutes,
    moderationReason,
    kickMutation,
    banMutation,
    unbanMutation,
    muteMutation,
    unmuteMutation,
    closeModerationAction,
  ]);

  const isModerationPending =
    kickMutation.isPending ||
    banMutation.isPending ||
    unbanMutation.isPending ||
    muteMutation.isPending ||
    unmuteMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Voice Rooms" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{t('error')}</p>
        <Button onClick={() => refetch()}>{t('retry')}</Button>
      </div>
    );
  }

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: 'Room',
      render: (room) => (
        <div className="flex items-center gap-3 min-w-0">
          <RoomThumbnail room={room} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 dark:text-white">{roomName(room)}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono">
                {room.roomCode}
              </Badge>
              <span className="truncate font-mono text-[10px] text-gray-400">
                {room.publicRoomId ?? 'No public ID'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (room) => (
        <Badge variant={roomStatusVariant(room.status)}>{room.status ?? 'unknown'}</Badge>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (room) => <span className="text-gray-600 dark:text-gray-400">{room.level}</span>,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (room) => (
        <span className="text-gray-600 dark:text-gray-400">{room.capacity ?? '—'}</span>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (room) => (
        <span className="text-gray-600 dark:text-gray-400">{room.country ?? '—'}</span>
      ),
    },
    {
      key: 'memberCount',
      header: 'Members',
      render: (room) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4" />
          {room.memberCount ?? '—'}
        </span>
      ),
    },
    {
      // Header matches the key and the rendered value: this is the last-update
      // timestamp, not the creation timestamp.
      key: 'updatedAt',
      header: 'Updated',
      render: (room) => {
        const date = new Date(room.updatedAt);
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-28',
      render: (room) => (
        <div className="flex justify-end">
          <RoomActionsMenu items={roomActions(room)} label={`Actions for ${roomName(room)}`} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Voice Rooms" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <ViewToggle value={viewMode} onChange={setViewMode} />
        {data && (
          <p className="text-sm text-gray-500">
            {filteredRooms.length} / {data.total} {t('items') || 'rooms'}
          </p>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onView={() => handleViewRoom(room)}
              {...(canManageRooms
                ? {
                    onEdit: () => handleEditRoom(room),
                    onDelete: () => setDeleteTarget(room),
                  }
                : {})}
            />
          ))}
          {filteredRooms.length === 0 && (
            <EmptyState message="No rooms found" icon={<Inbox className="w-10 h-10" />} />
          )}
        </div>
      ) : (
        <DataTable
          data={filteredRooms}
          columns={columns}
          searchable
          searchPlaceholder="Search rooms..."
          onSearch={handleSearch}
          pagination={
            data && {
              page: data.page,
              limit: data.limit,
              total: data.total,
              totalPages: data.totalPages,
              onPageChange: handlePageChange,
            }
          }
          emptyMessage="No rooms found"
        />
      )}

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRoomId(null);
          setActiveTab('members');
        }}
        title={roomDetail?.name?.en || roomDetail?.name?.ar || 'Room Details'}
        size="xl"
      >
        {selectedRoomId && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {roomDetail && <RoomThumbnail room={roomDetail} className="h-12 w-12" />}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {roomName(roomDetail)}
                  </p>
                  {roomDetail?.slogan && (
                    <p className="truncate text-xs text-gray-500">{roomDetail.slogan}</p>
                  )}
                </div>
              </div>
              {canManageRooms && roomDetail && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditRoom(roomDetail)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(roomDetail)}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-3 border-b border-gray-200 pb-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500">Public Room ID</p>
                <p className="font-mono font-semibold">
                  {roomDetail?.publicRoomId ?? 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Internal UUID</p>
                <p className="break-all font-mono text-xs">{roomDetail?.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Room code</p>
                <Badge variant="default">{roomDetail?.roomCode}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={roomStatusVariant(roomDetail?.status)}>
                  {roomDetail?.status ?? 'unknown'}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p>
                  {roomDetail?.owner?.profile?.nickname ??
                    roomDetail?.owner?.profile?.username ??
                    roomDetail?.ownerId ??
                    'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Progression</p>
                <p>
                  Level {roomDetail?.level} · {roomDetail?.xp ?? 0} XP
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Capacity</p>
                <p>
                  {members.length} / {roomDetail?.capacity ?? '—'} members
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Country</p>
                <p>{roomDetail?.country ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Slogan</p>
                <p>{roomDetail?.slogan ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Profile image</p>
                {roomDetail?.profileImageUrl ? (
                  <a
                    href={roomDetail.profileImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-indigo-600 hover:underline break-all"
                  >
                    {roomDetail.profileImageUrl}
                  </a>
                ) : (
                  <p>Not set</p>
                )}
              </div>
              {/* Preset catalog references accepted by UpdateRoomDto — identifiers, not URLs. */}
              <div>
                <p className="text-xs text-gray-500">Background preset</p>
                <p className="font-mono text-xs">{roomDetail?.backgroundId ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Theme preset</p>
                <p className="font-mono text-xs">{roomDetail?.themeId ?? 'Not set'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={activeTab === 'members' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('members')}
              >
                Members ({members.length})
              </Button>
              {canManageRooms && (
                <Button
                  variant={activeTab === 'moderation' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('moderation')}
                >
                  Moderation
                </Button>
              )}
              {canManageRooms && (
                <Button
                  variant={activeTab === 'rounds' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('rounds')}
                >
                  PK Rounds
                </Button>
              )}
            </div>

            {activeTab === 'rounds' && selectedRoomId && (
              <RoomRoundsPanel roomId={selectedRoomId} />
            )}

            {activeTab === 'members' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {member.user?.nickname?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user?.nickname || 'Unknown User'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={
                              member.role === 'owner'
                                ? 'success'
                                : member.role === 'developer'
                                  ? 'warning'
                                  : member.role === 'moderator'
                                    ? 'info'
                                    : 'default'
                            }
                          >
                            {member.role}
                          </Badge>
                          {member.isMuted && (
                            <Badge variant="warning">
                              <MicOff className="w-3 h-3 mr-1" />
                              Muted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {member.role !== 'owner' && canManageRooms && (
                      <div className="flex gap-2">
                        {member.role === 'developer' ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              revokePlatformRole(member.userId)
                            }
                            disabled={revokePlatformRoleMutation.isPending}
                          >
                            Revoke developer
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => assignPlatformRole(member.userId)}
                              disabled={assignPlatformRoleMutation.isPending}
                            >
                              Make developer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openModerationAction(member.isMuted ? 'unmute' : 'mute', member.userId)
                              }
                              disabled={muteMutation.isPending || unmuteMutation.isPending}
                            >
                              {member.isMuted ? 'Unmute' : 'Mute'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openModerationAction('kick', member.userId)}
                              disabled={kickMutation.isPending}
                            >
                              Kick
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => openModerationAction('ban', member.userId)}
                              disabled={banMutation.isPending}
                            >
                              Ban
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No members found</p>
                )}
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200 dark:border-red-900/50">
                    <CardContent className="text-center py-4">
                      <Shield className="w-6 h-6 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">{bans.length}</p>
                      <p className="text-xs text-gray-500">Bans</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 dark:border-amber-900/50">
                    <CardContent className="text-center py-4">
                      <MicOff className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">{mutes.length}</p>
                      <p className="text-xs text-gray-500">Mutes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="text-center py-4">
                      <UserX className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                      <p className="text-2xl font-bold">{kicks.length}</p>
                      <p className="text-xs text-gray-500">Kicks</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {bans.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Active Bans ({bans.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {bans.map((ban) => (
                          <div
                            key={ban.id}
                            className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                          >
                            <span className="text-gray-700 dark:text-gray-300" title={ban.userId}>
                              {userDisplayName(ban)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openModerationAction('unban', ban.userId)}
                              disabled={unbanMutation.isPending}
                            >
                              Unban
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {mutes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Active Mutes ({mutes.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {mutes.map((mute) => (
                          <div
                            key={mute.id}
                            className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm"
                          >
                            <span className="text-gray-700 dark:text-gray-300" title={mute.userId}>
                              {userDisplayName(mute)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openModerationAction('unmute', mute.userId)}
                              disabled={unmuteMutation.isPending}
                            >
                              Unmute
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {bans.length === 0 && mutes.length === 0 && kicks.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No moderation actions recorded</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(actionTarget)}
        onClose={closeModerationAction}
        title={
          actionTarget
            ? `${actionTarget.action[0]?.toUpperCase()}${actionTarget.action.slice(1)} room member`
            : 'Room moderation'
        }
        size="sm"
      >
        {actionTarget && (
          <div className="space-y-4">
            <Input label="Target user" value={actionTarget.userId} disabled />

            {actionTarget.action === 'kick' && (
              <Select
                label="Kick duration"
                value={kickDurationType}
                onChange={(event) => setKickDurationType(event.target.value as '2h' | '12m')}
                options={[
                  { value: '2h', label: '2 hours' },
                  { value: '12m', label: '12 minutes' },
                ]}
              />
            )}

            {actionTarget.action === 'mute' && (
              <>
                <Select
                  label="Mute scope"
                  value={muteType}
                  onChange={(event) => setMuteType(event.target.value as 'chat' | 'mic' | 'all')}
                  options={[
                    { value: 'chat', label: 'Chat only' },
                    { value: 'mic', label: 'Microphone only' },
                    { value: 'all', label: 'Chat and microphone' },
                  ]}
                />
                <Input
                  label="Duration in minutes (optional)"
                  type="number"
                  min={1}
                  value={muteDurationMinutes}
                  onChange={(event) => setMuteDurationMinutes(event.target.value)}
                />
              </>
            )}

            {['kick', 'ban', 'mute'].includes(actionTarget.action) && (
              <Input
                label="Reason (optional)"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
              />
            )}

            {actionError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeModerationAction}
                disabled={isModerationPending}
              >
                Cancel
              </Button>
              <Button
                variant={['ban', 'kick'].includes(actionTarget.action) ? 'danger' : 'primary'}
                onClick={() => void handleModerationAction()}
                disabled={isModerationPending}
              >
                {isModerationPending ? 'Applying…' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {editingRoom && (
        <RoomEditModal
          key={editingRoom.id}
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={() => setEditingRoom(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete room"
        confirmText="Delete room"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget || !canManageRooms) return;
          await deleteMutation.mutateAsync({ roomId: deleteTarget.id });
        }}
      >
        <p className="text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">
            {roomName(deleteTarget)}
          </span>{' '}
          ({deleteTarget?.roomCode}) will be permanently removed, along with its memberships, bans,
          mutes and kick history. This cannot be undone.
        </p>
        {deleteMutation.error && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : 'The delete failed.'}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
