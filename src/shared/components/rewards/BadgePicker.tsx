"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Search, X } from "lucide-react";
import badgesService from "@/services/badges.service";
import type { BadgeDefinitionView } from "@/types/badges";
import { cn } from "@/shared/lib/utils";

interface BadgePickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function titleOf(badge: BadgeDefinitionView): string {
  return badge.title.en ?? badge.title.ar ?? badge.badgeKey;
}

function BadgeArtwork({ badge }: { badge: BadgeDefinitionView }) {
  const source = badge.icon?.thumbnailUrl;
  return source ? (
    // The backend returns the canonical signed/public MediaService thumbnail.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={badge.icon?.altText ?? titleOf(badge)}
      className="h-9 w-9 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
      <Award className="h-4 w-4" />
    </span>
  );
}

/** Selects real canonical BadgeDefinitions; Store items are never used as badge substitutes. */
export function BadgePicker({ value, onChange, disabled }: BadgePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<BadgeDefinitionView | null>(null);
  const optionsQuery = useQuery({
    queryKey: ["badge-options", query],
    queryFn: () => badgesService.options(query),
    enabled: open && (!picked || picked.id !== value),
    staleTime: 30_000,
  });
  const selectedQuery = useQuery({
    queryKey: ["badge-definition", value],
    queryFn: () => badgesService.get(value),
    enabled: Boolean(value) && picked?.id !== value,
    staleTime: 60_000,
  });
  const selected =
    picked?.id === value
      ? picked
      : selectedQuery.data?.id === value
        ? selectedQuery.data
        : null;
  const results = optionsQuery.data ?? [];
  const loading = optionsQuery.isFetching;

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-2 dark:border-gray-600 dark:bg-gray-800">
          <BadgeArtwork badge={selected} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
              {titleOf(selected)}
            </span>
            <span className="block truncate text-[10px] text-gray-400">
              {selected.badgeKey} · {selected.status} · {selected.id}
            </span>
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setPicked(null);
              }}
              className="text-gray-400 hover:text-red-500"
              aria-label="Clear badge"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            disabled={disabled}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={value || "Search active badges by name/key…"}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pe-3 ps-9 text-sm text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              No active badges found
            </div>
          )}
          {results.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => {
                onChange(badge.id);
                setPicked(badge);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50",
                badge.id === value && "bg-indigo-50 dark:bg-indigo-900/20",
              )}
            >
              <BadgeArtwork badge={badge} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-gray-900 dark:text-white">
                  {titleOf(badge)}
                </span>
                <span className="block truncate text-[10px] text-gray-400">
                  {badge.badgeKey} · {badge.badgeType}
                  {badge.achievementTier ? `/${badge.achievementTier}` : ""}
                </span>
              </span>
              {badge.id === value && (
                <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default BadgePicker;
