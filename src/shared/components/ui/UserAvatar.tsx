'use client';

import { useState } from 'react';

interface UserAvatarProps {
  /** Avatar URL from the API. Missing or broken URLs fall back to initials. */
  src?: string | null;
  /** Display name used to derive the initials fallback. */
  name?: string | null;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '?';
  const second = parts[1];
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

/**
 * Small avatar with a deterministic initials fallback.
 * The adjacent name is always rendered as text, so both the image and the
 * fallback are decorative for assistive technology.
 */
export function UserAvatar({ src, name, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = name?.trim() || 'Unknown user';

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200 ${className}`}
      >
        {initialsOf(label)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-9 w-9 shrink-0 rounded-full object-cover bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}
