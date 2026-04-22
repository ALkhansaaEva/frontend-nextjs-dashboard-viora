import type { User, Wallet } from './api.types';

export namespace AuthEndpoints {
  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface RegisterRequest {
    email: string;
    password: string;
  }

  export interface RefreshTokenRequest {
    refreshToken: string;
  }

  export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
  }

  export interface RequestOTPRequest {
    email: string;
  }

  export interface VerifyOTPRequest {
    email: string;
    token: string;
  }

  export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
    roles: string[];
  }
}

export namespace UsersEndpoints {
  export interface UpdateProfileRequest {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    gender?: string;
    country?: string;
    language?: string;
  }

  export interface UpdatePresenceRequest {
    onlineStatus: 'online' | 'away' | 'dnd' | 'invisible';
    statusText?: string;
  }

  export interface UserProfileResponse extends User {
    wallet: Wallet;
    equippedCosmetics?: {
      background?: string;
      frame?: string;
      badge?: string;
    };
  }

  export interface ListUsersParams {
    search?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }
}

export namespace AdminEndpoints {
  export interface ListRolesParams {
    search?: string;
    limit?: number;
    offset?: number;
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
  }

  export interface AssignRoleRequest {
    roleCode: string;
  }

  export interface AssignPermissionRequest {
    permissionCode: string;
  }

  export interface AdjustBalanceRequest {
    currency: 'gold' | 'gems';
    amount: string;
    action: 'add' | 'deduct';
    reason: string;
  }

  export interface ListUsersParams {
    search?: string;
    limit?: number;
    offset?: number;
  }

  export interface RefundRequest {
    reason: string;
  }
}

export namespace RoomsEndpoints {
  export interface CreateRoomRequest {
    name: Record<string, string>;
  }

  export interface ListRoomsParams {
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'popular';
  }

  export interface RoomResponse {
    id: string;
    name: Record<string, string>;
    ownerId: string;
    memberCount: number;
    maxMembers: number;
    isActive: boolean;
    isPrivate: boolean;
    createdAt: string;
  }

  export interface RoomMember {
    userId: string;
    role: 'owner' | 'moderator' | 'member';
    joinedAt: string;
    user: {
      id: string;
      nickname: string;
      avatar?: string;
    };
  }

  export interface RoomMessage {
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
}

export namespace StoreEndpoints {
  export interface CreateItemRequest {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    title: Record<string, string>;
    priceGems?: number;
    priceCoins?: number;
    isStackable?: boolean;
    defaultExpiryHours?: number;
    assets?: Record<string, unknown>;
    styleConfig?: Record<string, unknown>;
    isActive?: boolean;
  }

  export interface ListItemsParams {
    scope?: string;
    gameType?: string;
    limit?: number;
    offset?: number;
  }

  export interface PurchaseBundleRequest {
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

  export interface ListInventoryParams {
    scope?: 'profile' | 'room' | 'game';
    gameType?: string;
    filter?: 'active' | 'all' | 'expired';
    sortBy?: 'acquiredAt' | 'rarity' | 'name';
    limit?: number;
    offset?: number;
  }
}

export namespace SupportEndpoints {
  export interface CreateTicketRequest {
    subject: string;
    message: string;
    category?: string;
  }

  export interface ReplyTicketRequest {
    content: string;
    isInternal?: boolean;
  }

  export interface ListTicketsParams {
    search?: string;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }

  export interface UpdateTicketStatusRequest {
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
  }
}

export namespace ReportsEndpoints {
  export interface CreateReportRequest {
    reportedUserId: string;
    reason: string;
  }

  export interface TakeActionRequest {
    action: 'warn' | 'mute' | 'ban' | 'dismiss';
    reason?: string;
    durationHours?: number;
  }

  export interface UpdateReportStatusRequest {
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  }

  export interface ListReportsParams {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
}

export namespace ModerationEndpoints {
  export interface CreateSanctionRequest {
    userId: string;
    type: 'ban' | 'mute';
    reason: string;
    durationHours?: number;
  }

  export interface ListSanctionsParams {
    userId?: string;
    type?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }

  export interface CreateStrikeRequest {
    userId: string;
    reason: string;
  }
}

export namespace ConfigsEndpoints {
  export interface UpdateConfigRequest {
    value: string;
    description?: string;
  }

  export interface ListConfigsParams {
    category?: string;
    limit?: number;
    offset?: number;
  }
}

export namespace RanksEndpoints {
  export interface CreateRankRequest {
    code: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    requiredXP: number;
    privileges?: string[];
  }

  export interface ListRanksParams {
    limit?: number;
    offset?: number;
  }
}

export namespace WalletEndpoints {
  export interface AddFundsRequest {
    currency: 'gold' | 'gems';
    amount: number;
  }

  export interface Transaction {
    id: string;
    userId: string;
    type: 'deposit' | 'withdrawal' | 'purchase' | 'reward' | 'adjustment';
    currency: 'gold' | 'gems';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description?: string;
    createdAt: string;
  }
}