# Viora API Endpoints Reference

All API endpoints from `viora-api-collection.json`. Base URL: `https://backend-fastify-nestjs-viora.vercel.app/v1`

---

## Auth (16 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/email/register | Register with email/password |
| POST | /auth/email/login | Login with email/password |
| POST | /auth/email/request-otp | Request OTP for email verification |
| POST | /auth/email/verify-otp | Verify email OTP |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout current user |
| POST | /auth/phone/request-otp | Request OTP for phone |
| POST | /auth/phone/verify-otp | Verify phone OTP |
| POST | /auth/mfa/enroll | Begin MFA enrollment |
| POST | /auth/mfa/verify-enable | Verify and enable MFA |
| GET | /auth/google/url | Get Google OAuth URL |
| POST | /auth/google/callback | Verify Google auth code |
| GET | /auth/facebook/url | Get Facebook OAuth URL |
| POST | /auth/facebook/callback | Verify Facebook auth code |
| POST | /auth/link-provider | Link OAuth provider to account |
| POST | /auth/devices/fcm-token | Register FCM token |

---

## Users (9 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Get current user's profile |
| GET | /users/me/bootstrap | Get profile + wallet + daily login + loadout |
| PATCH | /users/me/profile | Update profile |
| PATCH | /users/me/avatar | Update avatar |
| PATCH | /users/me/profile-cosmetics | Update profile cosmetics |
| PATCH | /users/me/presence | Update presence status |
| PATCH | /users/me/email-otp | Verify email with OTP |
| GET | /users/:immutableUserId | Get user by ID |

---

## Rooms (28 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /rooms | List rooms |
| POST | /rooms | Create room |
| GET | /rooms/:roomId | Get room details |
| GET | /rooms/:roomId/members | Get room members |
| POST | /rooms/:roomId/join | Join room |
| POST | /rooms/:roomId/leave | Leave room |
| GET | /rooms/:roomId/chat | Get room chat messages |
| POST | /rooms/:roomId/kick/:targetUserId | Kick user |
| POST | /rooms/:roomId/ban/:targetUserId | Ban user |
| POST | /rooms/:roomId/unban/:targetUserId | Unban user |
| POST | /rooms/:roomId/mute/:targetUserId | Mute user |
| POST | /rooms/:roomId/unmute/:targetUserId | Unmute user |
| POST | /rooms/:roomId/assign-role/:targetUserId | Assign role |
| POST | /rooms/:roomId/remove-role/:targetUserId | Remove role |
| POST | /rooms/:roomId/transfer-ownership/:newOwnerId | Transfer ownership |
| POST | /rooms/:roomId/close | Close room |
| POST | /rooms/:roomId/reopen | Reopen room |
| POST | /rooms/:roomId/mic-slots/:index/state | Toggle mic slot |
| PATCH | /rooms/:roomId/theme | Update room theme |
| PATCH | /rooms/:roomId/wallpaper | Update room wallpaper |
| PATCH | /rooms/:roomId/slogan | Update room slogan |
| POST | /rooms/:roomId/pins | Pin message |
| GET | /rooms/:roomId/pins | Get pinned messages |
| DELETE | /rooms/:roomId/pins/:pinId | Remove pin |
| DELETE | /rooms/:roomId/chat/:messageId | Delete chat message |
| GET | /rooms/:roomId/bans | List bans |
| GET | /rooms/:roomId/kicks | List kicks |
| GET | /rooms/:roomId/mutes | List mutes |
| GET | /rooms/:roomId/moderators | List moderators |

---

## Store (18 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /store/items | List store items |
| POST | /store/items | Create store item (admin) |
| GET | /store/bundles | List bundles |
| POST | /store/purchase/:bundleId | Purchase bundle |
| GET | /store/inventory | Get user inventory |
| POST | /store/purchase/item/:itemId | Purchase item |
| POST | /store/gift/item/:itemId | Gift item to friend |
| POST | /store/equip/:inventoryId | Equip item |
| DELETE | /store/equip/:slot | Unequip item |
| GET | /store/loadout/me | Get equipped loadout |
| GET | /store/loadout/me/with-defaults | Get loadout with defaults |
| GET | /store/validate-cosmetics/:gameType | Validate cosmetics |
| GET | /store/gifts/received | Get received gifts |
| POST | /store/gifts/:giftId/accept | Accept gift |
| POST | /store/gifts/:giftId/decline | Decline gift |
| GET | /store/gifts/sent | Get sent gifts |
| POST | /store/inventory/:inventoryId/use | Use inventory item |

---

## Matches (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /matches/create | Create private match |
| POST | /matches/join-by-code | Join by code |
| POST | /matches/:matchId/invite | Invite player |
| POST | /matches/invite/:inviteId/accept | Accept invite |
| POST | /matches/invite/:inviteId/decline | Decline invite |
| GET | /matches/invites/me | Get my invites |
| GET | /matches/history | Get match history |
| GET | /matches/history/:matchId | Get specific match |
| GET | /matches/:matchId/chat | Get match chat |

---

## Matchmaking (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /matchmaking/join | Join matchmaking |
| DELETE | /matchmaking/leave | Leave matchmaking |

---

## Meta-Game (9 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /meta-game/daily-login | Get daily login status |
| POST | /meta-game/daily-login/claim | Claim daily login reward |
| GET | /meta-game/tasks | Get tasks |
| POST | /meta-game/tasks/:taskId/claim | Claim task reward |
| GET | /meta-game/ranking/:gameType | Get ranking |
| GET | /meta-game/ranking/:gameType/leaderboard | Get leaderboard |
| GET | /meta-game/ranking/:gameType/user/:userId | Get user rank |
| POST | /meta-game/ranking/:gameType/friends | Get friends ranking |

---

## Social (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /social/friend-request/:userId | Send friend request |
| POST | /social/friend-request/accept/:requestId | Accept request |
| GET | /social/friends | Get friends list |
| POST | /social/block/:userId | Block user |
| POST | /social/mute/:userId | Mute user |
| GET | /social/messages/:friendId | Get messages |
| POST | /social/friend-request/reject/:requestId | Reject request |
| POST | /social/friend-request/cancel/:requestId | Cancel request |
| POST | /social/unblock/:userId | Unblock user |
| POST | /social/unmute/:userId | Unmute user |

---

## Wallet (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /wallet | Get wallet balance |
| GET | /wallet/transactions | Get transaction history |

---

## Notifications (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | Get notifications |
| POST | /notifications/:id/read | Mark as read |
| POST | /notifications/read-all | Mark all as read |

---

## Ranks (12 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /ranks/system | Get rank system |
| POST | /ranks/system | Create rank system |
| POST | /ranks/system/assign | Assign rank |
| POST | /ranks/system/revoke/:userId/:rankId | Revoke rank |
| GET | /ranks/system/user/:userId | Get user rank |
| GET | /ranks/system/me | Get my rank |
| GET | /ranks/room/:roomId | Get room ranks |
| POST | /ranks/room | Create room rank |
| POST | /ranks/room/assign | Assign room rank |
| POST | /ranks/room/revoke/:roomId/:userId/:roomRankId | Revoke room rank |
| GET | /ranks/room/:roomId/user/:userId | Get user room rank |
| GET | /ranks/room/:roomId/me | Get my room rank |

---

## Reports (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reports | Create report |
| GET | /reports | List reports |
| GET | /reports/me | My reports |
| GET | /reports/:id | Get report |
| POST | /reports/:id/evidence | Add evidence |
| POST | /reports/:id/action | Take action |
| POST | /reports/:id/status | Update status |
| POST | /reports/:id/assign | Assign report |

---

## Support (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /support/tickets | List tickets |
| GET | /support/tickets/me | My tickets |
| GET | /support/tickets/:id | Get ticket |
| POST | /support/tickets | Create ticket |
| POST | /support/tickets/:id/reply | Reply to ticket |
| POST | /support/tickets/:id/status | Update ticket status |
| POST | /support/tickets/:id/assign | Assign ticket |
| POST | /support/tickets/:id/note | Add note |

---

## Moderation (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /moderation/users/:id/sanction | Sanction user |
| POST | /moderation/users/:id/strike | Strike user |
| GET | /moderation/users/:id/sanctions/active | Get active sanctions |

---

## Admin (15 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/roles | List roles |
| GET | /admin/users/:id/roles | Get user roles |
| POST | /admin/users/:id/roles/assign | Assign role |
| POST | /admin/users/:id/roles/revoke | Revoke role |
| POST | /admin/users/:id/balance | Adjust balance |
| GET | /admin/permissions | List permissions |
| GET | /admin/roles/:code/permissions | Get role permissions |
| POST | /admin/roles/:code/permissions/assign | Assign permission |
| POST | /admin/roles/:code/permissions/revoke | Revoke permission |
| POST | /admin/roles | Create role |
| POST | /admin/permissions | Create permission |
| GET | /admin/users | List users |
| GET | /admin/users/:id | Get user |
| POST | /admin/refunds/:purchaseId | Refund purchase |

---

## Configs (1 endpoint)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /configs | Get app configs |

---

## Summary

| Category | Count |
|----------|-------|
| Auth | 16 |
| Users | 9 |
| Rooms | 28 |
| Store | 18 |
| Matches | 10 |
| Matchmaking | 2 |
| Meta-Game | 9 |
| Social | 10 |
| Wallet | 2 |
| Notifications | 3 |
| Ranks | 12 |
| Reports | 8 |
| Support | 8 |
| Moderation | 3 |
| Admin | 15 |
| Configs | 1 |
| **TOTAL** | **154** |