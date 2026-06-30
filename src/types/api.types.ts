export interface User {
  id: string;
  immutableUserId: string;
  email: string;
  nickname: string;
  title?: string;
  status: 'active' | 'suspended' | 'banned';
  roles: Role[];
  createdAt: string;
  lastLogin?: string;
  wallet?: Wallet;
  avatar?: string;
}

export interface Wallet {
  userId: string;
  gold: number;
  gems: number;
}

export interface Role {
  id: string;
  code: string;
  name?: string | null;
  isSystem?: boolean | null;
  isDefault?: boolean | null;
  scope?: string | null;
  priority?: number | string | null;
  level?: number | string | null;
  description?: string | null;
  permissions?: string[] | null;
  permissionsMask?: string | null;
  inheritsFrom?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Permission {
  id: string;
  code: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  reporter?: User;
  reportedUser?: User;
  evidence?: ReportEvidence[];
}

export interface ReportEvidence {
  id: string;
  reportId: string;
  type: string;
  url?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  user?: User;
  messages?: TicketMessage[];
  assignee?: User;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: User;
}

export interface Sanction {
  id: string;
  userId: string;
  sanctionType: 'ban' | 'mute';
  reason: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface Strike {
  id: string;
  userId: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface HealthMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  activeConnections: number;
  redis: {
    serverId: string;
    isRedisEnabled: boolean;
    registeredUsers: number;
    registeredGames: number;
    registeredRooms: number;
  };
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
  roles: string[];
  permissions?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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
  priority?: number;
  scope?: 'global' | 'room';
  inheritsFrom?: string;
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string;
}

export interface AssignRoleRequest {
  roleCode: string;
}

export interface AdjustBalanceRequest {
  currency: 'gold' | 'gems';
  amount: string;
  action: 'add' | 'deduct';
  reason: string;
}

export interface CreateReportRequest {
  reportedUserId: string;
  reason: string;
}

export interface AddEvidenceRequest {
  type: string;
  url: string;
  description?: string;
}

export interface TakeActionRequest {
  action: 'warn' | 'mute' | 'ban' | 'dismiss';
  reason?: string;
}

export interface UpdateStatusRequest {
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

export interface AssignReportRequest {
  assigneeId: string;
}

export interface AssignTicketRequest {
  assigneeId: string;
}

export interface AddNoteRequest {
  content: string;
  isInternal?: boolean;
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

export interface SanctionRequest {
  type: 'ban' | 'mute' | 'warning';
  reason: string;
  durationHours?: number;
}

export interface StrikeRequest {
  reason: string;
}

export interface CreateStoreItemRequest {
  code: string;
  type: string;
  slot: string;
  scope: string;
  title: Record<string, string>;
  priceGems?: number;
  priceCoins?: number;
  rarity?: string;
  isActive?: boolean;
}

export interface CreateStoreBundleRequest {
  name: Record<string, string>;
  price: string;
  currency: 'gold' | 'gems';
  items: { gold?: string; items: string[] };
  isActive?: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  activeReports: number;
  openTickets: number;
  activeSanctions: number;
  totalMatches?: number;
  activeRooms?: number;
  totalGifts?: number;
  totalAchievements?: number;
  storeItems?: number;
  dailyActiveUsers?: number;
  newUsersToday?: number;
  revenueToday?: number;
  totalRevenue?: number;
  avgResponseTime?: number;
  systemLoad?: number;
  onlineUsers?: number;
}