import type { User } from './api.types';

export namespace AuthAPI {
  export interface RegisterRequest {
    email: string;
    password: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface RequestOTPRequest {
    email: string;
  }

  export interface VerifyOTPRequest {
    email: string;
    token: string;
  }

  export interface RefreshRequest {
    refreshToken: string;
  }

  export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
  }

  export interface PhoneRequestOTPRequest {
    phone: string;
  }

  export interface PhoneVerifyOTPRequest {
    phone: string;
    token: string;
  }

  export interface GoogleURLResponse {
    url: string;
  }

  export interface GoogleCallbackRequest {
    code: string;
  }

  export interface FacebookCallbackRequest {
    code: string;
  }

  export interface LinkProviderRequest {
    provider: 'facebook' | 'phone' | 'email';
  }

  export interface FCMTokenRequest {
    fcmToken: string;
  }

  export interface MFAEnrollResponse {
    secret: string;
    qrCodeUri: string;
    factorId: string;
  }

  export interface MFAVerifyEnableRequest {
    factorId: string;
    code: string;
  }
}

export namespace UsersAPI {
  export interface GetMeResponse extends User {
    wallet: {
      userId: string;
      gold: number;
      gems: number;
    };
    equippedCosmetics?: {
      background?: string;
      frame?: string;
      badge?: string;
    };
    onlineStatus?: string;
    statusText?: string;
  }

  export interface BootstrapResponse {
    user: User;
    settings: UserSettings;
    wallet: {
      userId: string;
      gold: number;
      gems: number;
    };
    roles: string[];
    permissions: string[];
  }

  export interface UserSettings {
    language: string;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    musicEnabled: boolean;
    pushNotificationsEnabled: boolean;
  }

  export interface UpdateProfileRequest {
    username?: string;
    avatarUrl?: string;
    bio?: string;
    countryCode?: string;
    gender?: string;
  }

  export interface UpdateAvatarRequest {
    avatarUrl: string;
  }

  export interface UpdateCosmeticsRequest {
    equippedCosmetics: {
      background?: string;
      frame?: string;
      badge?: string;
    };
  }

  export interface UpdatePresenceRequest {
    onlineStatus: 'online' | 'offline' | 'away' | 'busy';
    statusText?: string;
  }

  export interface UpdateEmailOTPRequest {
    enabled: boolean;
  }

  export interface PublicProfileResponse {
    id: string;
    immutableUserId: string;
    nickname: string;
    avatar?: string;
    title?: string;
    onlineStatus?: string;
    statusText?: string;
    roles: string[];
    equippedCosmetics?: {
      background?: string;
      frame?: string;
      badge?: string;
    };
  }
}

export namespace RoomsAPI {
  export interface Room {
    id: string;
    name: LocalizedString;
    slogan?: LocalizedString;
    ownerId: string;
    owner?: {
      id: string;
      nickname: string;
      avatar?: string;
    };
    memberCount: number;
    maxMembers: number;
    isActive: boolean;
    isPrivate: boolean;
    backgroundId?: string;
    themeId?: string;
    createdAt: string;
    micSlots?: MicSlot[];
  }

  export interface LocalizedString {
    en: string;
    ar?: string;
    [key: string]: string | undefined;
  }

  export interface MicSlot {
    index: number;
    userId?: string;
    state: 'open' | 'taken' | 'locked';
    user?: {
      id: string;
      nickname: string;
      avatar?: string;
    };
  }

  export interface RoomMember {
    userId: string;
    role: 'owner' | 'moderator' | 'member';
    joinedAt: string;
    user: {
      id: string;
      nickname: string;
      avatar?: string;
      onlineStatus?: string;
    };
  }

  export interface CreateRoomRequest {
    name: LocalizedString;
    slogan?: LocalizedString;
    isPrivate?: boolean;
    maxMembers?: number;
    backgroundId?: string;
    themeId?: string;
  }

  export interface UpdateRoomRequest {
    name?: LocalizedString;
    slogan?: LocalizedString;
    backgroundId?: string;
    themeId?: string;
  }

  export interface JoinRoomResponse {
    room: Room;
    token?: string;
  }

  export interface ChatMessage {
    id: string;
    roomId: string;
    userId: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    user: {
      id: string;
      nickname: string;
      avatar?: string;
    };
  }

  export interface KickRequest {
    reason: string;
  }

  export interface BanRequest {
    reason: string;
    durationHours?: number;
  }

  export interface MuteRequest {
    muteType: 'chat' | 'voice' | 'all';
    durationMinutes: number;
    reason: string;
  }

  export interface AssignRoleRequest {
    role: 'moderator' | 'member';
  }

  export interface TransferOwnershipRequest {
    newOwnerId: string;
  }

  export interface PinMessageRequest {
    message: string;
  }

  export interface RoomBannedUser {
    userId: string;
    reason: string;
    bannedAt: string;
    expiresAt?: string;
    user: {
      id: string;
      nickname: string;
      avatar?: string;
    };
  }

  export interface RoomMutedUser {
    userId: string;
    muteType: 'chat' | 'voice' | 'all';
    reason: string;
    expiresAt: string;
    user: {
      id: string;
      nickname: string;
      avatar?: string;
    };
  }

  export type ListParams = {
    limit?: number;
    offset?: number;
    sortBy?: 'memberCount' | 'createdAt' | 'name';
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
    isPrivate?: boolean;
  };
}

export namespace StoreAPI {
  export interface StoreItem {
    id: string;
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    title: LocalizedString;
    description?: LocalizedString;
    priceGems?: number;
    priceCoins?: number;
    isStackable: boolean;
    defaultExpiryHours?: number;
    assets: {
      imageUrl?: string;
      previewUrl?: string;
    };
    isActive: boolean;
    createdAt: string;
  }

  export interface LocalizedString {
    en: string;
    ar?: string;
    [key: string]: string | undefined;
  }

  export interface CreateItemRequest {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    title: LocalizedString;
    description?: LocalizedString;
    priceGems?: number;
    priceCoins?: number;
    isStackable?: boolean;
    defaultExpiryHours?: number;
    assets?: {
      imageUrl?: string;
      previewUrl?: string;
    };
    isActive?: boolean;
  }

  export interface StoreBundle {
    id: string;
    code: string;
    title: LocalizedString;
    description?: LocalizedString;
    items: {
      itemId: string;
      quantity: number;
    }[];
    priceGems?: number;
    priceCoins?: number;
    discountPercent?: number;
    isActive: boolean;
    expiresAt?: string;
    createdAt: string;
  }

  export interface PurchaseRequest {
    currencyType: 'gems' | 'coins';
  }

  export interface PurchaseResponse {
    orderId: string;
    items: {
      itemId: string;
      quantity: number;
      expiresAt?: string;
    }[];
  }

  export interface InventoryItem {
    id: string;
    itemId: string;
    userId: string;
    quantity: number;
    acquiredAt: string;
    expiresAt?: string;
    item: StoreItem;
  }

  export interface InventoryParams {
    scope?: 'profile' | 'room' | 'game';
    gameType?: string;
    filter?: 'active' | 'all' | 'expired';
    sortBy?: 'acquiredAt' | 'rarity' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
}

export namespace AdminAPI {
  export interface UserListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }

  export interface UpdateUserStatusRequest {
    status: 'active' | 'suspended' | 'banned';
    reason?: string;
  }

  export interface RoleListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }

  export interface CreateRoleRequest {
    code: string;
    name: string;
    description?: string;
    level: number;
  }

  export interface UpdateRoleRequest {
    name?: string;
    description?: string;
    level?: number;
    permissions?: string[];
  }

  export interface AssignRoleRequest {
    roleCode: string;
  }

  export interface PermissionListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }

  export interface ConfigListParams {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }

  export interface UpdateConfigRequest {
    value: string;
    description?: string;
  }

  export interface AuditLogParams {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }

  export interface AuditLogEntry {
    id: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
    user?: {
      id: string;
      nickname: string;
    };
  }
}

export namespace SupportAPI {
  export interface TicketListParams {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    userId?: string;
    search?: string;
  }

  export interface CreateTicketRequest {
    subject: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }

  export interface ReplyTicketRequest {
    content: string;
    isInternal?: boolean;
  }

  export interface UpdateTicketStatusRequest {
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
  }
}

export namespace ReportsAPI {
  export interface ReportListParams {
    page?: number;
    limit?: number;
    status?: string;
    reporterId?: string;
    reportedUserId?: string;
  }

  export interface CreateReportRequest {
    reportedUserId: string;
    reason: string;
    evidence?: {
      type: string;
      url?: string;
      description?: string;
    }[];
  }

  export interface TakeActionRequest {
    action: 'warn' | 'mute' | 'ban' | 'dismiss';
    reason?: string;
    durationHours?: number;
  }

  export interface UpdateReportStatusRequest {
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  }
}

export namespace ModerationAPI {
  export interface SanctionListParams {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
    isActive?: boolean;
  }

  export interface CreateSanctionRequest {
    userId: string;
    type: 'ban' | 'mute';
    reason: string;
    durationHours?: number;
  }

  export interface StrikeListParams {
    page?: number;
    limit?: number;
    userId?: string;
  }

  export interface CreateStrikeRequest {
    userId: string;
    reason: string;
  }
}