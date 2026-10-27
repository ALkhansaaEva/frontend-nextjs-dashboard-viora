"use client";

import { useEffect, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { adminService } from "@/services/admin.service";
import type { User } from "@/types";
import { cn } from "@/shared/lib/utils";

interface UserSelectorProps {
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Searches the real Users admin list (GET /admin/users?search=) instead of
 * asking the operator to paste a raw user UUID — used for Agent/Distributor
 * creation, where the backend only accepts a `userId`.
 */
export function UserSelector({
  value,
  onChange,
  disabled,
  placeholder,
}: UserSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      adminService
        .getUsers({ search: query || undefined, limit: 20 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    adminService
      .getUserIdentity(value)
      .then((u) => {
        if (u)
          setSelected({
            id: u.id,
            nickname: u.nickname,
            email: u.email,
            status: u.status as User["status"],
            immutableUserId: u.immutableUserId,
            roles: [],
            createdAt: "",
          });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
            {selected.nickname || selected.email}
            {selected.email && (
              <span className="text-gray-400 font-normal ml-1.5">
                ({selected.email})
              </span>
            )}
            {selected.immutableUserId && (
              <span className="block font-mono text-[10px] font-normal text-indigo-500">
                {selected.immutableUserId}
              </span>
            )}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSelected(null);
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            disabled={disabled}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              placeholder ?? "Search by nickname, email, or immutable user ID…"
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              No users found
            </div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u.id);
                setSelected(u);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                u.id === value && "bg-indigo-50 dark:bg-indigo-900/20",
              )}
            >
              <span className="truncate">
                <span className="font-medium text-gray-900 dark:text-white">
                  {u.nickname || u.email}
                </span>
                {u.email && (
                  <span className="text-gray-400 ml-1.5">({u.email})</span>
                )}
                {u.immutableUserId && (
                  <span className="block font-mono text-[10px] text-indigo-500">
                    {u.immutableUserId}
                  </span>
                )}
              </span>
              {u.id === value && (
                <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserSelector;
