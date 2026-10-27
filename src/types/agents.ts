/**
 * Agents / Distribution — canonical backend contract types, ported field-for-field
 * from src/modules/agents/{entities,dto}/*.ts. Do not invent fields.
 */

export type AgentStatus = 'pending' | 'active' | 'held' | 'suspended' | 'closed';

export interface AgentProfile {
  id: string;
  userId: string;
  status: AgentStatus;
  externalReference?: string | null;
  capabilities: string[];
  restrictions: string[];
  suspensionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  userId: string;
  externalReference?: string;
}

export interface SetAgentStatusRequest {
  status: 'active' | 'held' | 'suspended' | 'closed';
  reason?: string;
}

/** Positive integer GAME_CURRENCY amount string — never a JS number. */
export interface AgentTransferRequest {
  amount: string;
  recipientUserId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentPolicyRequest {
  version: string;
  commissionBps?: string;
  fundingAccountOwnerId?: string;
  perTransactionLimit?: string;
  dailyLimit?: string;
  weeklyLimit?: string;
  monthlyLimit?: string;
  velocityLimit?: string;
  customerCountLimit?: string;
  cashoutLimit?: string;
  withdrawalLimit?: string;
  transferLimit?: string;
}

export type AgentTopupState =
  | 'draft' | 'submitted' | 'under_review' | 'approved' | 'settled'
  | 'rejected' | 'cancelled' | 'reversed' | 'manual_review';

export interface ReviewAgentTopupRequest {
  decision: 'approve' | 'reject' | 'manual_review';
  reason?: string;
}

// ── Distribution ──────────────────────────────────────────────────────────

export type DistributionStatus = 'pending' | 'active' | 'suspended' | 'closed';
export type ExchangeRateType =
  'providerPurchaseRate' | 'distributorSellRate' | 'agentCustomerSellRate' | 'customerCashoutRate';
export type ExchangeRoundingRule = 'FLOOR' | 'CEIL' | 'HALF_UP';
export type ExchangeRatePolicyStatus = 'draft' | 'pending_approval' | 'active' | 'retired';

export interface MasterDistributorProfile {
  id: string;
  userId: string;
  status: DistributionStatus;
  capabilities: string[];
  allowedRegions: string[];
  metadata: Record<string, unknown>;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributorRequest {
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface CreateRatePolicyRequest {
  rateType: ExchangeRateType;
  version: number;
  fiatCurrency: string;
  gameCurrencyUnits: string;
  fiatMinorUnits: string;
  roundingRule: ExchangeRoundingRule;
  minimumGameAmount?: string;
  maximumGameAmount?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface ExchangeRatePolicy {
  id: string;
  rateType: ExchangeRateType;
  version: number;
  status: ExchangeRatePolicyStatus;
  fiatCurrency: string;
  gameCurrencyUnits: string;
  fiatMinorUnits: string;
  roundingRule: ExchangeRoundingRule;
  minimumGameAmount: string | null;
  maximumGameAmount: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  approvedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CashoutReleaseRequest {
  target: 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  reason: string;
}

export interface DistributorListQuery {
  status?: DistributionStatus;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface DistributorListResult {
  items: MasterDistributorProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface DistributorAgentAssignment {
  id: string;
  distributorId: string;
  agentId: string;
  status: 'active' | 'ended';
  assignedBy: string;
  endedBy: string | null;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
