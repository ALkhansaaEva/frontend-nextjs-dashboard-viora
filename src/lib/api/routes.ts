export interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  auth: boolean;
  summary: string;
}

export const API_CONTRACT: Record<string, Record<string, RouteDefinition>> = {
  auth: {
    'email/register':    { path: '/auth/email/register', method: 'POST', auth: false, summary: 'Register with email' },
    'email/login':        { path: '/auth/email/login', method: 'POST', auth: false, summary: 'Login with email' },
    'email/request-otp':  { path: '/auth/email/request-otp', method: 'POST', auth: false, summary: 'Request email OTP' },
    'email/verify-otp':  { path: '/auth/email/verify-otp', method: 'POST', auth: false, summary: 'Verify email OTP' },
    'phone/request-otp': { path: '/auth/phone/request-otp', method: 'POST', auth: false, summary: 'Request phone OTP' },
    'phone/verify-otp':  { path: '/auth/phone/verify-otp', method: 'POST', auth: false, summary: 'Verify phone OTP' },
    'facebook/url':       { path: '/auth/facebook/url', method: 'GET', auth: false, summary: 'Get Facebook OAuth URL' },
    'facebook/callback': { path: '/auth/facebook/callback', method: 'POST', auth: false, summary: 'Facebook OAuth callback' },
    'google/url':        { path: '/auth/google/url', method: 'GET', auth: false, summary: 'Get Google OAuth URL' },
    'google/callback':   { path: '/auth/google/callback', method: 'POST', auth: false, summary: 'Google OAuth callback' },
    'mfa/enroll':       { path: '/auth/mfa/enroll', method: 'POST', auth: true, summary: 'Start MFA enrollment' },
    'mfa/verify-enable':{ path: '/auth/mfa/verify-enable', method: 'POST', auth: true, summary: 'Verify and enable MFA' },
    'link-provider':     { path: '/auth/link-provider', method: 'POST', auth: true, summary: 'Link auth provider' },
    'refresh':          { path: '/auth/refresh', method: 'POST', auth: false, summary: 'Refresh access token' },
    'logout':           { path: '/auth/logout', method: 'POST', auth: true, summary: 'Logout' },
    'devices/fcm-token':{ path: '/auth/devices/fcm-token', method: 'POST', auth: true, summary: 'Register FCM token' },
  },

  users: {
    'get-me':           { path: '/users/me', method: 'GET', auth: true, summary: 'Get current user' },
    'get-bootstrap':    { path: '/users/me/bootstrap', method: 'GET', auth: true, summary: 'Get user bootstrap data' },
    'update-profile':  { path: '/users/me/profile', method: 'PATCH', auth: true, summary: 'Update profile' },
    'update-avatar':    { path: '/users/me/avatar', method: 'PATCH', auth: true, summary: 'Update avatar' },
    'update-cosmetics': { path: '/users/me/profile-cosmetics', method: 'PATCH', auth: true, summary: 'Update cosmetics' },
    'update-presence': { path: '/users/me/presence', method: 'PATCH', auth: true, summary: 'Update presence status' },
    'update-email-otp':{ path: '/users/me/email-otp', method: 'PATCH', auth: true, summary: 'Enable/disable email OTP' },
    'get-user':         { path: '/users/:immutableUserId', method: 'GET', auth: true, summary: 'Get user by ID' },
  },

  admin: {
    'get-roles':        { path: '/admin/roles', method: 'GET', auth: true, summary: 'List all roles' },
    'create-role':      { path: '/admin/roles', method: 'POST', auth: true, summary: 'Create role' },
    'get-role':         { path: '/admin/roles/:code', method: 'GET', auth: true, summary: 'Get role by code' },
    'update-role':      { path: '/admin/roles/:code', method: 'PUT', auth: true, summary: 'Update role' },
    'get-role-permissions':{ path: '/admin/roles/:code/permissions', method: 'GET', auth: true, summary: 'Get role permissions' },
    'assign-permission': { path: '/admin/roles/:code/permissions/assign', method: 'POST', auth: true, summary: 'Assign permission to role' },
    'revoke-permission':{ path: '/admin/roles/:code/permissions/revoke', method: 'POST', auth: true, summary: 'Revoke permission from role' },
    'get-permissions':   { path: '/admin/permissions', method: 'GET', auth: true, summary: 'List all permissions' },
    'create-permission':{ path: '/admin/permissions', method: 'POST', auth: true, summary: 'Create permission' },
    'get-users':        { path: '/admin/users', method: 'GET', auth: true, summary: 'List users' },
    'get-user':         { path: '/admin/users/:id', method: 'GET', auth: true, summary: 'Get user details' },
    'get-user-roles':   { path: '/admin/users/:id/roles', method: 'GET', auth: true, summary: 'Get user roles' },
    'assign-role':      { path: '/admin/users/:id/roles/assign', method: 'POST', auth: true, summary: 'Assign role to user' },
    'revoke-role':      { path: '/admin/users/:id/roles/revoke', method: 'POST', auth: true, summary: 'Revoke role from user' },
    'adjust-balance':  { path: '/admin/users/:id/balance', method: 'POST', auth: true, summary: 'Adjust user balance' },
    'process-refund':   { path: '/admin/refunds/:purchaseId', method: 'POST', auth: true, summary: 'Process refund' },
  },

  rooms: {
    'list':              { path: '/rooms', method: 'GET', auth: false, summary: 'List rooms' },
    'create':           { path: '/rooms', method: 'POST', auth: true, summary: 'Create room' },
    'get':              { path: '/rooms/:roomId', method: 'GET', auth: false, summary: 'Get room details' },
    'get-members':     { path: '/rooms/:roomId/members', method: 'GET', auth: false, summary: 'Get room members' },
    'get-chat':          { path: '/rooms/:roomId/chat', method: 'GET', auth: false, summary: 'Get room chat' },
    'join':             { path: '/rooms/:roomId/join', method: 'POST', auth: true, summary: 'Join room' },
    'leave':            { path: '/rooms/:roomId/leave', method: 'POST', auth: true, summary: 'Leave room' },
    'kick':             { path: '/rooms/:roomId/kick/:targetUserId', method: 'POST', auth: true, summary: 'Kick user' },
    'ban':              { path: '/rooms/:roomId/ban/:targetUserId', method: 'POST', auth: true, summary: 'Ban user' },
    'unban':            { path: '/rooms/:roomId/unban/:targetUserId', method: 'POST', auth: true, summary: 'Unban user' },
    'mute':             { path: '/rooms/:roomId/mute/:targetUserId', method: 'POST', auth: true, summary: 'Mute user' },
    'unmute':           { path: '/rooms/:roomId/unmute/:targetUserId', method: 'POST', auth: true, summary: 'Unmute user' },
    'assign-role':       { path: '/rooms/:roomId/assign-role/:targetUserId', method: 'POST', auth: true, summary: 'Assign room role' },
    'remove-role':      { path: '/rooms/:roomId/remove-role/:targetUserId', method: 'POST', auth: true, summary: 'Remove room role' },
    'transfer-ownership':{path:'/rooms/:roomId/transfer-ownership/:newOwnerId',method:'POST',auth:true,summary:'Transfer ownership'},
    'close':            { path: '/rooms/:roomId/close', method: 'POST', auth: true, summary: 'Close room' },
    'reopen':           { path: '/rooms/:roomId/reopen', method: 'POST', auth: true, summary: 'Reopen room' },
    'set-theme':        { path: '/rooms/:roomId/theme', method: 'PATCH', auth: true, summary: 'Set room theme' },
    'set-wallpaper':    { path: '/rooms/:roomId/wallpaper', method: 'PATCH', auth: true, summary: 'Set room wallpaper' },
    'set-slogan':       { path: '/rooms/:roomId/slogan', method: 'PATCH', auth: true, summary: 'Set room slogan' },
    'pin-message':      { path: '/rooms/:roomId/pins', method: 'POST', auth: true, summary: 'Pin message' },
    'get-pins':         { path: '/rooms/:roomId/pins', method: 'GET', auth: false, summary: 'Get pinned messages' },
    'delete-pin':       { path: '/rooms/:roomId/pins/:pinId', method: 'DELETE', auth: true, summary: 'Delete pin' },
    'delete-message':  { path: '/rooms/:roomId/chat/:messageId', method: 'DELETE', auth: true, summary: 'Delete message' },
    'get-bans':         { path: '/rooms/:roomId/bans', method: 'GET', auth: true, summary: 'Get banned users' },
    'get-kicks':        { path: '/rooms/:roomId/kicks', method: 'GET', auth: true, summary: 'Get kicked users' },
    'get-mutes':        { path: '/rooms/:roomId/mutes', method: 'GET', auth: true, summary: 'Get muted users' },
    'get-moderators':   { path: '/rooms/:roomId/moderators', method: 'GET', auth: true, summary: 'Get moderators' },
  },

  store: {
    'list-items':       { path: '/store/items', method: 'GET', auth: true, summary: 'List store items' },
    'create-item':     { path: '/store/items', method: 'POST', auth: true, summary: 'Create store item' },
    'list-bundles':     { path: '/store/bundles', method: 'GET', auth: true, summary: 'List bundles' },
    'create-bundle':   { path: '/store/bundles', method: 'POST', auth: true, summary: 'Create bundle' },
    'purchase':        { path: '/store/purchase/:bundleId', method: 'POST', auth: true, summary: 'Purchase bundle' },
    'inventory':       { path: '/store/inventory', method: 'GET', auth: true, summary: 'Get user inventory' },
  },

  support: {
    'list-tickets':     { path: '/support/tickets', method: 'GET', auth: true, summary: 'List tickets' },
    'create-ticket':    { path: '/support/tickets', method: 'POST', auth: true, summary: 'Create ticket' },
    'get-ticket':       { path: '/support/tickets/:ticketId', method: 'GET', auth: true, summary: 'Get ticket' },
    'reply-ticket':     { path: '/support/tickets/:ticketId/reply', method: 'POST', auth: true, summary: 'Reply to ticket' },
    'update-ticket':   { path: '/support/tickets/:ticketId/status', method: 'PATCH', auth: true, summary: 'Update ticket status' },
  },

  reports: {
    'list':            { path: '/reports', method: 'GET', auth: true, summary: 'List reports' },
    'create':          { path: '/reports', method: 'POST', auth: true, summary: 'Create report' },
    'get':             { path: '/reports/:reportId', method: 'GET', auth: true, summary: 'Get report' },
    'add-evidence':    { path: '/reports/:reportId/evidence', method: 'POST', auth: true, summary: 'Add evidence' },
    'take-action':     { path: '/reports/:reportId/action', method: 'POST', auth: true, summary: 'Take action' },
    'update-status':   { path: '/reports/:reportId/status', method: 'PATCH', auth: true, summary: 'Update status' },
  },

  moderation: {
    'sanction-user':    { path: '/moderation/users/:id/sanction', method: 'POST', auth: true, summary: 'Sanction user' },
    'strike-user':     { path: '/moderation/users/:id/strike', method: 'POST', auth: true, summary: 'Strike user' },
    'get-active-sanctions':{path:'/moderation/users/:id/sanctions/active',method:'GET',auth:true,summary:'Get active sanctions'},
  },

  ranks: {
    'get-system':       { path: '/ranks/system', method: 'GET', auth: true, summary: 'Get system ranks' },
    'create-system-rank':{ path: '/ranks/system', method: 'POST', auth: true, summary: 'Create system rank' },
    'assign-system-rank':{path:'/ranks/system/assign',method:'POST',auth:true,summary:'Assign system rank'},
    'revoke-system-rank':{path:'/ranks/system/revoke/:userId/:rankId',method:'POST',auth:true,summary:'Revoke system rank'},
    'get-user-ranks':  { path: '/ranks/system/user/:userId', method: 'GET', auth: true, summary: 'Get user ranks' },
    'get-my-ranks':     { path: '/ranks/system/me', method: 'GET', auth: true, summary: 'Get my ranks' },
    'get-room-ranks':   { path: '/ranks/room/:roomId', method: 'GET', auth: true, summary: 'Get room ranks' },
    'create-room-rank':{ path: '/ranks/room', method: 'POST', auth: true, summary: 'Create room rank' },
    'assign-room-rank':{ path: '/ranks/room/assign', method: 'POST', auth: true, summary: 'Assign room rank' },
    'revoke-room-rank': { path: '/ranks/room/revoke/:roomId/:userId/:roomRankId',method:'POST',auth:true,summary:'Revoke room rank'},
  },

  configs: {
    'list':            { path: '/configs', method: 'GET', auth: true, summary: 'List configs' },
    'update':          { path: '/configs/:key', method: 'PUT', auth: true, summary: 'Update config' },
  },

  social: {
    'send-friend-request':{path:'/social/friend-request/:userId',method:'POST',auth:true,summary:'Send friend request'},
    'accept-friend':    { path: '/social/friend-request/accept/:requestId', method: 'POST', auth: true, summary: 'Accept friend' },
    'get-friends':      { path: '/social/friends', method: 'GET', auth: true, summary: 'Get friends' },
    'block-user':       { path: '/social/block/:userId', method: 'POST', auth: true, summary: 'Block user' },
    'mute-user':        { path: '/social/mute/:userId', method: 'POST', auth: true, summary: 'Mute user' },
    'get-messages':    { path: '/social/messages/:friendId', method: 'GET', auth: true, summary: 'Get messages' },
  },

  voice: {
    'get-token':       { path: '/voice/token/:roomId', method: 'GET', auth: true, summary: 'Get voice token' },
    'get-match-token': { path: '/voice/match/:matchId/token', method: 'GET', auth: true, summary: 'Get match token' },
    'mute-match':      { path: '/voice/match/:matchId/mic/mute', method: 'POST', auth: true, summary: 'Mute in match' },
    'get-mic-state':   { path: '/voice/match/:matchId/mic/state', method: 'GET', auth: true, summary: 'Get mic state' },
    'admin-mic':       { path: '/voice/match/:matchId/mic/admin', method: 'POST', auth: true, summary: 'Admin mic' },
  },

  health: {
    'get':             { path: '/health', method: 'GET', auth: false, summary: 'Health check' },
    'ready':           { path: '/health/ready', method: 'GET', auth: false, summary: 'Readiness check' },
    'metrics':         { path: '/health/metrics', method: 'GET', auth: false, summary: 'Metrics' },
  },
};