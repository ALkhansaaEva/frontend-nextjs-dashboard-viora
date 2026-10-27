import apiClient from "@/lib/api/api-client";
import { mediaPublicUrl } from "@/shared/lib/media-url";
import type {
  BadgeDefinitionListResult,
  BadgeDefinitionView,
  BadgeMediaView,
  BadgeStatus,
  BadgeType,
  CreateBadgeDefinitionInput,
  UpdateBadgeDefinitionInput,
} from "@/types/badges";


/**
 * `BadgeDefinitionView.icon` is a Media OBJECT, never a URL, and its
 * `thumbnailUrl` is never written backend-wide (always null) — resolve the
 * display URL from the asset path the same way the upload preview does.
 */
export function badgeIconUrl(icon: BadgeMediaView | null): string | null {
  // Shared resolver: a badge `icon` is a Media object whose display URL comes
  // from `path` (its `thumbnailUrl` is never written backend-wide), so the
  // proxy rule lives in exactly one place for Store, Gift and Badge alike.
  return mediaPublicUrl(icon) || null;
}

export const badgesService = {
  list(
    params: {
      badgeType?: BadgeType;
      status?: BadgeStatus;
      category?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    return apiClient.get<BadgeDefinitionListResult>("/admin/badges", {
      params,
    });
  },
  options(search?: string) {
    return apiClient.get<BadgeDefinitionView[]>("/admin/badges/options", {
      params: { search: search?.trim() || undefined },
    });
  },
  get(id: string) {
    return apiClient.get<BadgeDefinitionView>(`/admin/badges/${id}`);
  },
  create(input: CreateBadgeDefinitionInput) {
    return apiClient.post<BadgeDefinitionView>("/admin/badges", input);
  },
  updateDraft(id: string, input: UpdateBadgeDefinitionInput) {
    return apiClient.patch<BadgeDefinitionView>(`/admin/badges/${id}`, input);
  },
  activate(id: string, reason: string) {
    return apiClient.post<BadgeDefinitionView>(`/admin/badges/${id}/activate`, {
      reason,
    });
  },
  disable(id: string, reason: string) {
    return apiClient.post<BadgeDefinitionView>(`/admin/badges/${id}/disable`, {
      reason,
    });
  },
  /**
   * Branch a new editable DRAFT from an existing definition.
   *
   * ACTIVE and DISABLED definitions are immutable server-side, so this is the
   * only way to change an existing badge: copy it under a new key, then edit
   * the copy. Rejects a key that is already taken (409).
   */
  branchDraft(id: string, badgeKey: string) {
    return apiClient.post<BadgeDefinitionView>(`/admin/badges/${id}/draft`, {
      badgeKey,
    });
  },
  /**
   * Delete a never-awarded definition.
   *
   * Rejects with 409 when the badge has been awarded — disable it instead, so
   * player award history is preserved.
   */
  remove(id: string) {
    return apiClient.delete<{ success: boolean }>(`/admin/badges/${id}`);
  },
  revokeAward(awardId: string, reason: string) {
    return apiClient.post(`/admin/badges/awards/${awardId}/revoke`, { reason });
  },
};

export default badgesService;
