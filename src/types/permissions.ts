export type Permission = string;

export const PERMISSIONS: Permission[] = [
  // Legacy bitmask permissions
  'manage_users', 'view_users', 'manage_roles', 'manage_permissions',
  'manage_config', 'adjust_balance', 'view_transactions',
  'global_ban', 'global_mute', 'view_audit_logs', 'manage_reports',
  'manage_tickets', 'manage_all_rooms', 'manage_games',
  'room_kick_user', 'room_mute_user', 'room_ban_user',
  'room_manage_mic', 'room_assign_role', 'room_create_role',
  'room_transfer_ownership', 'room_edit_settings', 'room_manage_members',
  'room_edit_name', 'room_edit_slogan', 'room_invite_user',
  // Canonical permission codes
  'users.read', 'users.write', 'users.delete',
  'roles.read', 'roles.write', 'roles.execute', 'roles.delete',
  'permissions.read', 'permissions.write', 'permissions.execute', 'permissions.delete',
  'admin.read', 'admin.write', 'admin.all',
  'rooms.read', 'rooms.write', 'rooms.execute',
  'wallet.read', 'wallet.write', 'wallet.execute',
  'moderation.read', 'moderation.execute',
  'store.read', 'store.write',
  'media.read', 'media.write',
  'social.read', 'social.write',
  'reports.read', 'reports.execute',
  'support.execute',
  'matches.write',
  'configs.write',
  'voice.read', 'voice.execute',
  'store.catalog_read', 'store.catalog_manage',
  'achievements.read', 'achievements.write', 'achievements.delete',
  'gifts.read', 'gifts.write', 'gifts.delete',
  'manage_gift',
];
