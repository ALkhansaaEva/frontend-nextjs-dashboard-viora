export type BadgeType = 'ACHIEVEMENT' | 'HONOR';
export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type BadgeStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED';

export interface BadgeMediaView {
  id: string;
  bucket: string;
  path: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  thumbnailUrl: string | null;
}

export interface BadgeDefinitionView {
  id: string;
  badgeKey: string;
  badgeType: BadgeType;
  achievementTier: BadgeTier | null;
  category: string;
  rarity: string;
  status: BadgeStatus;
  title: Record<string, string>;
  description: Record<string, string>;
  wearable: boolean;
  icon: BadgeMediaView | null;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeDefinitionListResult {
  items: BadgeDefinitionView[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateBadgeDefinitionInput {
  badgeKey: string;
  badgeType: BadgeType;
  achievementTier?: BadgeTier;
  category: string;
  rarity?: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  iconMediaId: string;
  wearable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateBadgeDefinitionInput {
  category?: string;
  rarity?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  iconMediaId?: string;
  wearable?: boolean;
  metadata?: Record<string, unknown>;
}
