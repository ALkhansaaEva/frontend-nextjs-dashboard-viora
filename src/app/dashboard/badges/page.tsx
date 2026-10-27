"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Eye,
  GitBranch,
  ImageIcon,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import badgesService, { badgeIconUrl } from "@/services/badges.service";
import type {
  BadgeDefinitionView,
  BadgeStatus,
  BadgeTier,
  BadgeType,
  CreateBadgeDefinitionInput,
} from "@/types/badges";
import { useHasPermission } from "@/hooks/usePermissions";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { QueryState } from "@/shared/components/ui/QueryState";
import { Select } from "@/shared/components/ui/Select";
import { RuleMediaField } from "@/shared/components/rules/RuleMediaField";
import { cn } from "@/shared/lib/utils";
import { humanizeToken, yesNo } from "@/shared/lib/labels";
import { MediaPreview } from '@/shared/components/media/MediaPreview';

const LIMIT = 24;
const TYPES: BadgeType[] = ["ACHIEVEMENT", "HONOR"];
const STATUSES: BadgeStatus[] = ["DRAFT", "ACTIVE", "DISABLED"];
const TIERS: BadgeTier[] = ["BRONZE", "SILVER", "GOLD"];
const STATUS_VARIANT: Record<BadgeStatus, "default" | "success" | "danger"> = {
  DRAFT: "default",
  ACTIVE: "success",
  DISABLED: "danger",
};

/** Backend `badgeKey` pattern is `^[a-z][a-z0-9_]*$` — letter-leading, so a
 * leading digit/underscore run is dropped instead of being sent as a 400. */
function sanitizeBadgeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^[^a-z]+/, "");
}

type LifecycleAction = "activate" | "disable";

export default function BadgesPage() {
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission("achievements.read");
  const canWrite = hasPermission("achievements.write");
  const [type, setType] = useState<BadgeType | "">("");
  const [status, setStatus] = useState<BadgeStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [viewing, setViewing] = useState<BadgeDefinitionView | null>(null);
  // Editing holds only the id: the list row is a stale projection (page N of
  // a paginated query) and the draft must be re-read before it is edited.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BadgeDefinitionView | null>(
    null,
  );
  const [lifecycle, setLifecycle] = useState<{
    badge: BadgeDefinitionView;
    action: LifecycleAction;
  } | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");

  const queryKey = ["admin-badges", type, status, offset] as const;
  const query = useQuery({
    queryKey,
    queryFn: () =>
      badgesService.list({
        badgeType: type || undefined,
        status: status || undefined,
        limit: LIMIT,
        offset,
      }),
    enabled: canRead,
  });
  const editingQuery = useQuery({
    queryKey: ["admin-badge", editing],
    queryFn: () => badgesService.get(editing as string),
    enabled: canRead && typeof editing === "string",
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
    queryClient.invalidateQueries({ queryKey: ["admin-badge"] });
  };
  const lifecycleMutation = useMutation({
    mutationFn: async ({
      badge,
      action,
      reason,
    }: {
      badge: BadgeDefinitionView;
      action: LifecycleAction;
      reason: string;
    }) =>
      action === "activate"
        ? badgesService.activate(badge.id, reason)
        : badgesService.disable(badge.id, reason),
    onSuccess: () => {
      setLifecycle(null);
      setLifecycleReason("");
      invalidate();
    },
  });

  const branchMutation = useMutation({
    mutationFn: ({ id, badgeKey }: { id: string; badgeKey: string }) =>
      badgesService.branchDraft(id, badgeKey),
    onSuccess: (draft) => {
      invalidate();
      setEditing(draft.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => badgesService.remove(id),
    onSuccess: () => {
      setEditing((current) =>
        typeof current === "string" && current === deleteTarget?.id
          ? null
          : current,
      );
      setDeleteTarget(null);
      invalidate();
    },
  });

  // ACTIVE and DISABLED definitions are immutable server-side, so changing an
  // existing badge means branching a new DRAFT under a fresh key.
  const branchDraftFrom = (badge: BadgeDefinitionView) => {
    const key = window.prompt(
      `Create an editable draft copied from "${badge.badgeKey}".\n` +
        "The new key must be unique and is the identity achievement rules bind to.",
      `${badge.badgeKey}_v2`,
    );
    if (key?.trim()) {
      branchMutation.mutate({ id: badge.id, badgeKey: key.trim() });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Badges"
        description="Achievement tier and honor badges. Icons are canonical Media assets; draft identity becomes immutable after activation."
        icon={<Medal className="h-5 w-5" />}
        action={
          canWrite
            ? {
                label: "Create badge",
                onClick: () => setEditing("new"),
                icon: <Plus className="h-4 w-4" />,
              }
            : undefined
        }
      />
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Badge definitions are managed here. Player awards are executed only by
          published rules that contain the <code>GrantBadge</code> action node.
        </p>
        <Link
          href="/dashboard/gameplay/rules"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
        >
          <GitBranch className="h-4 w-4" /> Open Rule Builder
        </Link>
      </div>
      {!canRead ? (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">
          You do not have <code>achievements.read</code>.
        </div>
      ) : (
        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Medal className="h-4 w-4" /> Badge catalog
              </CardTitle>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as BadgeType | "");
                    setOffset(0);
                  }}
                  options={[
                    { value: "", label: "All types" },
                    ...TYPES.map((value) => ({ value, label: value })),
                  ]}
                />
                <Select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as BadgeStatus | "");
                    setOffset(0);
                  }}
                  options={[
                    { value: "", label: "All statuses" },
                    ...STATUSES.map((value) => ({ value, label: value })),
                  ]}
                />
                <Button
                  className="col-span-2 sm:col-span-1"
                  size="sm"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => query.refetch()}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={query.isLoading}
              isError={query.isError}
              error={query.error}
              isEmpty={!query.data?.items.length}
              emptyMessage="No badges match these filters."
              onRetry={() => query.refetch()}
            >
              {query.data && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {query.data.items.map((badge) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        canWrite={canWrite}
                        busy={lifecycleMutation.isPending}
                        onView={() => setViewing(badge)}
                        onEdit={() => setEditing(badge.id)}
                        onAction={(action) => {
                          setLifecycleReason("");
                          setLifecycle({ badge, action });
                        }}
                        onDelete={() => setDeleteTarget(badge)}
                        onBranch={() => branchDraftFrom(badge)}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>
                      {offset + 1}–{Math.min(offset + LIMIT, query.data.total)}{" "}
                      of {query.data.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset === 0}
                        onClick={() =>
                          setOffset((value) => Math.max(0, value - LIMIT))
                        }
                      >
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset + LIMIT >= query.data.total}
                        onClick={() => setOffset((value) => value + LIMIT)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}
      {deleteTarget && (
        <Modal
          isOpen
          onClose={() => {
            setDeleteTarget(null);
            deleteMutation.reset();
          }}
          title="Delete badge definition"
        >
          <div className="space-y-3">
            {/* Show the badge's own media and title so the operator confirms the
                correct definition, not just a key. */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 via-violet-50 to-indigo-100 dark:from-amber-950/30 dark:via-violet-950/30 dark:to-indigo-950/40">
                <MediaPreview
                  media={deleteTarget.icon}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900 dark:text-white">
                  {deleteTarget.title?.en || deleteTarget.badgeKey}
                </p>
                <p className="truncate font-mono text-xs text-gray-500">{deleteTarget.badgeKey}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {deleteTarget.badgeKey} — permanently removes this definition.
              Players who already earned it keep the badge and its award
              history. Only badges still wired to achievement tiers must be
              re-pointed or disabled first.
            </p>
            {deleteMutation.error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {(deleteMutation.error as { message?: string } | null)?.message ||
                  "The badge could not be deleted."}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteTarget(null);
                  deleteMutation.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {branchMutation.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {branchMutation.error instanceof Error
            ? branchMutation.error.message
            : "Could not create a draft from this badge."}
        </p>
      )}
      {lifecycle && (
        <Modal
          isOpen
          onClose={() => setLifecycle(null)}
          title={
            lifecycle.action === "activate" ? "Activate badge" : "Disable badge"
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {lifecycle.badge.badgeKey} —{" "}
              {lifecycle.action === "activate"
                ? "activation makes the draft identity immutable and the badge awardable by published rules."
                : "disabling stops new awards; the definition stays as immutable audit history."}
            </p>
            <Input
              label="Reason (required, audited) *"
              value={lifecycleReason}
              onChange={(event) => setLifecycleReason(event.target.value)}
              placeholder="Why is this lifecycle change being made?"
            />
            {lifecycleMutation.error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {lifecycleMutation.error instanceof Error
                  ? lifecycleMutation.error.message
                  : "The lifecycle change failed."}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
              <Button variant="outline" onClick={() => setLifecycle(null)}>
                Cancel
              </Button>
              <Button
                variant={lifecycle.action === "activate" ? "success" : "danger"}
                disabled={
                  !lifecycleReason.trim() || lifecycleMutation.isPending
                }
                isLoading={lifecycleMutation.isPending}
                onClick={() =>
                  lifecycleMutation.mutate({
                    badge: lifecycle.badge,
                    action: lifecycle.action,
                    reason: lifecycleReason.trim(),
                  })
                }
              >
                {lifecycle.action === "activate" ? "Activate" : "Disable"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {viewing && (
        <BadgeDetail
          badge={viewing}
          onClose={() => setViewing(null)}
          onEdit={
            canWrite && viewing.status === "DRAFT"
              ? () => {
                  setViewing(null);
                  setEditing(viewing.id);
                }
              : undefined
          }
        />
      )}
      {editing && (
        <Modal
          isOpen
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Create badge" : "Edit badge draft"}
          size="xl"
        >
          <QueryState
            isLoading={editing !== "new" && editingQuery.isLoading}
            isError={editing !== "new" && editingQuery.isError}
            error={editingQuery.error}
            isEmpty={false}
            emptyMessage=""
            onRetry={() => editingQuery.refetch()}
          >
            <BadgeEditor
              key={editing}
              badge={editing === "new" ? null : (editingQuery.data ?? null)}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                invalidate();
              }}
            />
          </QueryState>
        </Modal>
      )}
    </div>
  );
}

/** Read-only projection of one definition. Every field below is served by
 * `definitionView` on the backend; the icon is a Media OBJECT, rendered via
 * its `path` because `thumbnailUrl` is never written. */
function BadgeDetail({
  badge,
  onClose,
  onEdit,
}: {
  badge: BadgeDefinitionView;
  onClose: () => void;
  onEdit?: () => void;
}) {
  // MediaPreview owns the decode-failure latch, so no local flag here.
  const image = badgeIconUrl(badge.icon);
  const title = badge.title.en || badge.title.ar || badge.badgeKey;
  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 via-violet-50 to-indigo-100 dark:from-amber-950/30 dark:via-violet-950/30 dark:to-indigo-950/40">
            {image ? (
              <MediaPreview
                url={image}
                alt={badge.icon?.altText || title}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-7 w-7 text-indigo-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate font-mono text-xs text-gray-500">
              {badge.badgeKey}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={STATUS_VARIANT[badge.status]}>{humanizeToken(badge.status)}</Badge>
              <Badge variant="outline">{humanizeToken(badge.badgeType)}</Badge>
              {badge.achievementTier && (
                <Badge variant="info">{humanizeToken(badge.achievementTier)}</Badge>
              )}
              <Badge variant="outline">{humanizeToken(badge.rarity)}</Badge>
            </div>
          </div>
        </div>

        {badge.description?.en && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {badge.description.en}
          </p>
        )}
        {badge.title.ar && (
          <p dir="rtl" className="text-sm text-gray-500">
            {badge.title.ar}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <DetailRow label="Category" value={humanizeToken(badge.category)} />
          <DetailRow label="Wearable" value={yesNo(badge.wearable)} />
          <DetailRow
            label="Icon"
            value={
              badge.icon
                ? `${badge.icon.bucket}/${badge.icon.path.split("/").pop() ?? badge.icon.path}`
                : "—"
            }
          />
          <DetailRow label="Icon asset" value={badge.icon?.id ?? "—"} mono />
          <DetailRow label="Created" value={formatDate(badge.createdAt)} />
          <DetailRow label="Updated" value={formatDate(badge.updatedAt)} />
        </dl>
        <p className="break-all font-mono text-[10px] text-gray-400">
          {badge.id}
        </p>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit draft
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-gray-400">{label}</dt>
      <dd
        className={cn(
          "truncate font-medium dark:text-gray-200",
          mono && "font-mono text-[10px] font-normal",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function BadgeCard({
  badge,
  canWrite,
  busy,
  onView,
  onEdit,
  onAction,
  onDelete,
  onBranch,
}: {
  badge: BadgeDefinitionView;
  canWrite: boolean;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onAction: (action: LifecycleAction) => void;
  onDelete: () => void;
  onBranch: () => void;
}) {
  const title = badge.title.en || badge.title.ar || badge.badgeKey;
  // MediaPreview owns the decode-failure latch, so no local flag here.
  const image = badgeIconUrl(badge.icon);
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={onView}
        className="relative flex aspect-[16/8] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-violet-50 to-indigo-100 transition hover:opacity-90 dark:from-amber-950/30 dark:via-violet-950/30 dark:to-indigo-950/40"
        aria-label={`View ${title} details`}
      >
        {image ? (
          <MediaPreview
            url={image}
            alt={badge.icon?.altText || title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-center text-indigo-400 dark:text-indigo-600">
            <ImageIcon className="h-9 w-9" />
            <span className="text-[10px]">No available icon</span>
          </div>
        )}
        <span className="absolute bottom-1.5 end-1.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Eye className="h-3 w-3" /> Details
        </span>
      </button>
      <div className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold dark:text-white">
              {title}
            </h2>
            <p className="truncate font-mono text-[10px] text-gray-400">
              {badge.badgeKey}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[badge.status]}>{humanizeToken(badge.status)}</Badge>
        </div>
        {badge.description?.en && (
          <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {badge.description.en}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-gray-400">Type</dt>
            <dd className="font-medium dark:text-gray-200">
              {humanizeToken(badge.badgeType)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Tier</dt>
            <dd className="font-medium dark:text-gray-200">
              {humanizeToken(badge.achievementTier)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Category</dt>
            <dd className="truncate dark:text-gray-200">{humanizeToken(badge.category)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Rarity</dt>
            <dd className="truncate dark:text-gray-200">{humanizeToken(badge.rarity)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Wearable</dt>
            <dd className="dark:text-gray-200">
              {yesNo(badge.wearable)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Created</dt>
            <dd className="flex items-center gap-1 dark:text-gray-200">
              <CalendarDays className="h-3 w-3 shrink-0 text-gray-400" />
              {formatDate(badge.createdAt)}
            </dd>
          </div>
        </dl>
        <p className="truncate font-mono text-[10px] text-gray-400" title={badge.id}>
          {badge.id}
        </p>
        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          {canWrite && badge.status === "DRAFT" && (
            <>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="success"
                disabled={busy}
                onClick={() => onAction("activate")}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Activate
              </Button>
            </>
          )}
          {canWrite && badge.status === "ACTIVE" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onBranch}
              >
                <GitBranch className="h-3.5 w-3.5" /> New draft
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => onAction("disable")}
              >
                <ShieldOff className="h-3.5 w-3.5" /> Disable
              </Button>
            </>
          )}
          {canWrite && badge.status === "DISABLED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onBranch}
              >
                <GitBranch className="h-3.5 w-3.5" /> New draft
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
          {canWrite && badge.status === "DRAFT" && (
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
          {!canWrite && (
            <Button
              size="sm"
              variant="ghost"
              className="col-span-2"
              onClick={onView}
            >
              <Eye className="h-3.5 w-3.5" /> View details
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function BadgeEditor({
  badge,
  onClose,
  onSaved,
}: {
  badge: BadgeDefinitionView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [badgeKey, setBadgeKey] = useState(badge?.badgeKey ?? "");
  const [badgeType, setBadgeType] = useState<BadgeType>(
    badge?.badgeType ?? "ACHIEVEMENT",
  );
  const [tier, setTier] = useState<BadgeTier>(
    badge?.achievementTier ?? "BRONZE",
  );
  const [category, setCategory] = useState(badge?.category ?? "achievement");
  const [rarity, setRarity] = useState(badge?.rarity ?? "common");
  const [titleEn, setTitleEn] = useState(badge?.title.en ?? "");
  const [titleAr, setTitleAr] = useState(badge?.title.ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(
    badge?.description.en ?? "",
  );
  const [iconMediaId, setIconMediaId] = useState<string | null>(
    badge?.icon?.id ?? null,
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!titleEn.trim()) throw new Error("English title is required.");
      if (!iconMediaId) throw new Error("Upload or select a badge icon first.");
      if (!badge) {
        // Backend `badgeKey` must match ^[a-z][a-z0-9_]*$ — surface the rule
        // instead of letting the server reject a digit-leading key.
        if (!/^[a-z][a-z0-9_]*$/.test(badgeKey))
          throw new Error(
            "Badge key must start with a letter and use lowercase letters, digits or underscores.",
          );
      }
      const editable = {
        category: category.trim(),
        rarity: rarity.trim(),
        title: {
          en: titleEn.trim(),
          ...(titleAr.trim() ? { ar: titleAr.trim() } : {}),
        },
        description: descriptionEn.trim()
          ? { en: descriptionEn.trim() }
          : undefined,
        iconMediaId,
      };
      if (badge) return badgesService.updateDraft(badge.id, editable);
      const input: CreateBadgeDefinitionInput = {
        badgeKey: badgeKey.trim(),
        badgeType,
        ...(badgeType === "ACHIEVEMENT" ? { achievementTier: tier } : {}),
        ...editable,
      };
      return badgesService.create(input);
    },
    onSuccess: onSaved,
  });
  return (
    <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Badge key *"
            value={badgeKey}
            disabled={Boolean(badge)}
            placeholder="achievement_topup_bronze"
            onChange={(event) =>
              setBadgeKey(sanitizeBadgeKey(event.target.value))
            }
          />
          <Select
            label="Type *"
            value={badgeType}
            disabled={Boolean(badge)}
            onChange={(event) => setBadgeType(event.target.value as BadgeType)}
            options={TYPES.map((value) => ({ value, label: value }))}
          />
          {badgeType === "ACHIEVEMENT" && (
            <Select
              label="Achievement tier *"
              value={tier}
              disabled={Boolean(badge)}
              onChange={(event) => setTier(event.target.value as BadgeTier)}
              options={TIERS.map((value) => ({ value, label: value }))}
            />
          )}
          <Input
            label="Category *"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <Input
            label="Rarity"
            value={rarity}
            onChange={(event) => setRarity(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Title (EN) *"
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
          />
          <Input
            label="Title (AR)"
            dir="rtl"
            value={titleAr}
            onChange={(event) => setTitleAr(event.target.value)}
          />
        </div>
        <Input
          label="Description (EN)"
          value={descriptionEn}
          onChange={(event) => setDescriptionEn(event.target.value)}
        />
        <RuleMediaField
          value={iconMediaId}
          onChange={setIconMediaId}
          bucket="badges"
          purpose="badge-icon"
          assetPreviewUrl={badgeIconUrl(badge?.icon ?? null)}
        />
        <p className="text-[11px] text-gray-500">
          Wearable policy is backend-authoritative: honor badges and Gold
          achievement badges are wearable.
        </p>
        {save.error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {save.error instanceof Error
              ? save.error.message
              : "Could not save badge."}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} isLoading={save.isPending}>
            Save draft
          </Button>
        </div>
    </div>
  );
}
