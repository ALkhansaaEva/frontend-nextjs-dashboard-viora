# Viora Backend Full API Contract

> **Version**: 1.0.0  
> **Last Updated**: April 2026  
> **Framework**: NestJS 11 (Fastify)  
> **Database**: PostgreSQL (Supabase)  
> **Real-time**: Socket.io WebSocket Gateway  
> **Documentation**: Swagger/OpenAPI at `/docs`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Module Architecture](#2-module-architecture)
3. [REST API Routes](#3-rest-api-design)
4. [DTO Schemas](#4-dto-schemas)
5. [WebSocket Gateway](#5-websocket-architecture)
6. [Event-Driven System](#6-event-driven-system)
7. [Auth & Security](#7-auth--security)
8. [Data Models](#8-data-models)
9. [Frontend Integration](#9-frontend-integration-guide)
10. [Error Handling](#10-error-handling)
11. [Real World Flows](#11-real-world-flows)

---

## 1. System Overview

### Architecture Type

| Attribute        | Value                                   |
| ---------------- | --------------------------------------- |
| **Architecture** | Modular Monolith with Event-Driven Core |
| **Framework**    | NestJS 11                               |
| **HTTP Adapter** | Fastify                                 |
| **Database**     | PostgreSQL (Supabase)                   |
| **ORM**          | TypeORM                                 |
| **Real-time**    | Socket.io (WebSocket Gateway)           |
| **Queue**        | BullMQ (optional, falls back to sync)   |
| **Cache**        | In-memory LRU + Redis (when available)  |

### Communication Methods

| Method        | Purpose                   | Port/Path                |
| ------------- | ------------------------- | ------------------------ |
| **REST API**  | CRUD, business operations | `http://localhost:3001`  |
| **WebSocket** | Real-time events          | `/events` namespace      |
| **Event Bus** | Async operations          | Internal (EventEmitter2) |
| **GraphQL**   | Not used                  | -                        |

### Scalability Model

- **Horizontal**: Multiple instances behind load balancer
- **Session**: JWT stateless (no sticky sessions)
- **Cache**: Redis fallback when available, in-memory LRU primary
- **DB Pool**: 20 connections

---

## 2. Module Architecture

### Module Overview

| Module            | Responsibility                     | Key Services                          |
| ----------------- | ---------------------------------- | ------------------------------------- |
| **Auth**          | Authentication, JWT, MFA           | AuthService, IdGeneratorService       |
| **Users**         | User profiles, settings            | UsersService, ProfileService          |
| **Wallet**        | Currency (Gold/Gems), transactions | WalletService                         |
| **Store**         | Items, bundles, inventory, loadout | StoreService                          |
| **Game**          | Matchmaking, game engine, rules    | GameEngineService, MatchmakingService |
| **Rooms**         | Voice rooms, chat                  | RoomsService                          |
| **Social**        | Friends, DMs, blocking             | SocialService                         |
| **Notifications** | Push (FCM), in-app                 | NotificationsService                  |
| **Moderation**    | Bans, mutes, content filter        | ModerationService                     |
| **Reports**       | User reports, evidence             | ReportsService                        |
| **Support**       | Tickets, messages                  | SupportService                        |
| **Admin**         | RBAC, system management            | AdminService                          |
| **Events**        | WebSocket gateway                  | AppGateway                            |
| **Meta-Game**     | Daily login, tasks, leaderboards   | MetaGameService                       |
| **Ranks**         | System ranks, room ranks           | RanksService                          |
| **Voice**         | Agora RTC tokens                   | VoiceService                          |
| **Media**         | File uploads/downloads             | MediaService                          |
| **Configs**       | Feature flags, system config       | ConfigsService                        |
| **Audit**         | Audit logs                         | AuditService                          |
| **Configs**       | Feature flags, system config       | ConfigsService                        |

---

## 3. REST API DESIGN

### Base URL

```
Production: https://api.viora.game/v1
Development: http://localhost:3001/v1
```

### Global Prefix

All routes are prefixed with `/v1` (implicit from controller base paths).

---

### 3.1 Auth Routes (`/auth`)

#### POST /auth/email/register

| Field           | Value                            |
| --------------- | -------------------------------- |
| **Method**      | POST                             |
| **URL**         | `/auth/email/register`           |
| **Description** | Register with email and password |
| **Auth**        | Public (No auth required)        |
| **Roles**       | -                                |

**Request DTO:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "player_one"
}
```

**Response DTO:** `AuthResponseDto`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "player_one"
  }
}
```

---

#### POST /auth/email/login

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Method**      | POST                          |
| **URL**         | `/auth/email/login`           |
| **Description** | Login with email and password |
| **Auth**        | Public                        |
| **Roles**       | -                             |

**Request DTO:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response DTO:** `AuthResponseDto`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1...",
  "expiresIn": 3600,
  "user": { ... }
}
```

---

#### POST /auth/phone/request-otp

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **Method**      | POST                               |
| **URL**         | `/auth/phone/request-otp`          |
| **Description** | Request OTP for phone number login |
| **Auth**        | Public                             |
| **Roles**       | -                                  |

**Request DTO:**

```json
{
  "phone": "+1234567890"
}
```

---

#### POST /auth/phone/verify-otp

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Method**      | POST                          |
| **URL**         | `/auth/phone/verify-otp`      |
| **Description** | Verify OTP and complete login |
| **Auth**        | Public                        |
| **Roles**       | -                             |

**Request DTO:**

```json
{
  "phone": "+1234567890",
  "token": "123456"
}
```

---

#### POST /auth/refresh

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| **Method**      | POST                                     |
| **URL**         | `/auth/refresh`                          |
| **Description** | Refresh access token using refresh token |
| **Auth**        | Public                                   |
| **Roles**       | -                                        |

**Request DTO:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

---

#### POST /auth/logout

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Method**      | POST                          |
| **URL**         | `/auth/logout`                |
| **Description** | Logout and invalidate session |
| **Auth**        | Bearer Token                  |
| **Roles**       | User                          |

**Headers:**

```
Authorization: Bearer <access_token>
```

---

#### POST /auth/mfa/enroll

| Field           | Value                                  |
| --------------- | -------------------------------------- |
| **Method**      | POST                                   |
| **URL**         | `/auth/mfa/enroll`                     |
| **Description** | Start MFA enrollment (returns QR code) |
| **Auth**        | Bearer Token                           |
| **Roles**       | User                                   |

**Response:**

```json
{
  "qrCode": "data:image/png;base64,...",
  "factorId": "factor_xxx"
}
```

---

#### GET /auth/facebook/url

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Method**      | GET                          |
| **URL**         | `/auth/facebook/url`         |
| **Description** | Get Facebook OAuth login URL |
| **Auth**        | Public                       |
| **Roles**       | -                            |

---

#### POST /auth/facebook/callback

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| **Method**      | POST                                     |
| **URL**         | `/auth/facebook/callback`                |
| **Description** | Exchange Facebook OAuth code for session |
| **Auth**        | Public                                   |
| **Roles**       | -                                        |

**Request DTO:**

```json
{
  "code": "Facebook OAuth code"
}
```

---

#### GET /auth/google/url

| Field           | Value                      |
| --------------- | -------------------------- |
| **Method**      | GET                        |
| **URL**         | `/auth/google/url`         |
| **Description** | Get Google OAuth login URL |
| **Auth**        | Public                     |
| **Roles**       | -                          |

---

#### POST /auth/google/callback

| Field           | Value                                  |
| --------------- | -------------------------------------- |
| **Method**      | POST                                   |
| **URL**         | `/auth/google/callback`                |
| **Description** | Exchange Google OAuth code for session |
| **Auth**        | Public                                 |
| **Roles**       | -                                      |

**Request DTO:**

```json
{
  "code": "Google OAuth code"
}
```

---

#### POST /auth/devices/fcm-token

| Field           | Value                                |
| --------------- | ------------------------------------ |
| **Method**      | POST                                 |
| **URL**         | `/auth/devices/fcm-token`            |
| **Description** | Register FCM push notification token |
| **Auth**        | Bearer Token                         |
| **Roles**       | User                                 |

**Request DTO:**

```json
{
  "token": "FCM device token",
  "platform": "android" | "ios"
}
```

---

### 3.2 User Routes (`/users`)

#### GET /users/me

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| **Method**      | GET                                          |
| **URL**         | `/users/me`                                  |
| **Description** | Get current user profile with equipped items |
| **Auth**        | Bearer Token                                 |
| **Roles**       | User                                         |

**Response DTO:**

```json
{
  "id": "uuid",
  "immutableUserId": "uuid",
  "email": "user@example.com",
  "username": "player_one",
  "nickname": "ProPlayer",
  "avatar": "https://...",
  "title": "Champion",
  "globalNickname": "player_one#1234",
  "status": "online",
  "presence": "playing",
  "profile": { ... },
  "loadout": [ ... ]
}
```

---

#### GET /users/me/bootstrap

| Field           | Value                                   |
| --------------- | --------------------------------------- |
| **Method**      | GET                                     |
| **URL**         | `/users/me/bootstrap`                   |
| **Description** | Get all bootstrap data in a single call |
| **Auth**        | Bearer Token                            |
| **Roles**       | User                                    |
| **Purpose**     | Reduces initial app load requests       |

**Response:** Combined profile + wallet + daily login + loadout

---

#### PATCH /users/me/profile

| Field           | Value                       |
| --------------- | --------------------------- |
| **Method**      | PATCH                       |
| **URL**         | `/users/me/profile`         |
| **Description** | Update current user profile |
| **Auth**        | Bearer Token                |
| **Roles**       | User                        |

**Request DTO:**

```json
{
  "nickname": "NewNickname",
  "title": "NewTitle",
  "status": "online"
}
```

---

#### GET /users/:immutableUserId

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| **Method**      | GET                                       |
| **URL**         | `/users/:immutableUserId`                 |
| **Description** | Get user by immutable ID (public profile) |
| **Auth**        | Public                                    |
| **Path Params** | `immutableUserId`: User's immutable ID    |

---

### 3.3 Store Routes (`/store`)

#### GET /store/items

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Method**       | GET                                              |
| **URL**          | `/store/items`                                   |
| **Description**  | Get all active store items with optional filters |
| **Auth**         | Bearer Token                                     |
| **Query Params** | `scope`, `gameType`, `slot`                      |

**Query Example:**

```
GET /store/items?gameType=ludo&slot=ludo_board
```

**Response:** Array of StoreItem with `owned` and `equipped` flags

---

#### GET /store/bundles

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Method**      | GET                          |
| **URL**         | `/store/bundles`             |
| **Description** | Get all active store bundles |
| **Auth**        | Bearer Token                 |
| **Roles**       | User                         |

---

#### POST /store/purchase/:bundleId

| Field           | Value                       |
| --------------- | --------------------------- |
| **Method**      | POST                        |
| **URL**         | `/store/purchase/:bundleId` |
| **Description** | Purchase a store bundle     |
| **Auth**        | Bearer Token                |
| **Roles**       | User                        |
| **Path Params** | `bundleId`: Bundle ID       |

---

#### GET /store/inventory

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| **Method**       | GET                                    |
| **URL**          | `/store/inventory`                     |
| **Description**  | Get current user inventory             |
| **Auth**         | Bearer Token                           |
| **Query Params** | `sortBy`, `filter`, `gameType`, `slot` |

**Query Example:**

```
GET /store/inventory?filter=available&gameType=ludo
```

---

#### GET /store/loadout/me

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| **Method**      | GET                                       |
| **URL**         | `/store/loadout/me`                       |
| **Description** | Get current user loadout (equipped items) |
| **Auth**        | Bearer Token                              |

---

#### GET /store/loadout/me/with-defaults

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **Method**      | GET                                |
| **URL**         | `/store/loadout/me/with-defaults`  |
| **Description** | Get loadout with default fallbacks |
| **Auth**        | Bearer Token                       |

---

#### POST /store/equip/:inventoryId

| Field           | Value                            |
| --------------- | -------------------------------- |
| **Method**      | POST                             |
| **URL**         | `/store/equip/:inventoryId`      |
| **Description** | Equip an inventory item          |
| **Auth**        | Bearer Token                     |
| **Path Params** | `inventoryId`: Inventory item ID |

---

#### GET /store/validate-cosmetics/:gameType

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| **Method**      | GET                                      |
| **URL**         | `/store/validate-cosmetics/:gameType`    |
| **Description** | Validate equipped cosmetics (anti-cheat) |
| **Auth**        | Bearer Token                             |
| **Path Params** | `gameType`: `ludo` or `domino`           |

**Response:**

```json
{
  "valid": true,
  "validItems": [...],
  "invalidItems": [],
  "warnings": []
}
```

---

### 3.4 Wallet Routes (`/wallet`)

#### GET /wallet

| Field           | Value                           |
| --------------- | ------------------------------- |
| **Method**      | GET                             |
| **URL**         | `/wallet`                       |
| **Description** | Get current user wallet balance |
| **Auth**        | Bearer Token                    |
| **Roles**       | User                            |

**Response:**

```json
{
  "gold": 1000,
  "gems": 50,
  "userId": "uuid"
}
```

---

#### GET /wallet/transactions

| Field            | Value                   |
| ---------------- | ----------------------- |
| **Method**       | GET                     |
| **URL**          | `/wallet/transactions`  |
| **Description**  | Get transaction history |
| **Auth**         | Bearer Token            |
| **Query Params** | `limit`, `offset`       |

---

### 3.5 Notifications Routes (`/notifications`)

#### GET /notifications

| Field           | Value                  |
| --------------- | ---------------------- |
| **Method**      | GET                    |
| **URL**         | `/notifications`       |
| **Description** | Get user notifications |
| **Auth**        | Bearer Token           |

---

#### POST /notifications/:id/read

| Field           | Value                     |
| --------------- | ------------------------- |
| **Method**      | POST                      |
| **URL**         | `/notifications/:id/read` |
| **Description** | Mark notification as read |
| **Auth**        | Bearer Token              |
| **Path Params** | `id`: Notification ID     |

---

#### POST /notifications/read-all

| Field           | Value                          |
| --------------- | ------------------------------ |
| **Method**      | POST                           |
| **URL**         | `/notifications/read-all`      |
| **Description** | Mark all notifications as read |
| **Auth**        | Bearer Token                   |

---

### 3.6 Social Routes (`/social`)

#### GET /social/friends

| Field           | Value             |
| --------------- | ----------------- |
| **Method**      | GET               |
| **URL**         | `/social/friends` |
| **Description** | Get friends list  |
| **Auth**        | Bearer Token      |

---

#### POST /social/friend-request/:userId

| Field           | Value                            |
| --------------- | -------------------------------- |
| **Method**      | POST                             |
| **URL**         | `/social/friend-request/:userId` |
| **Description** | Send friend request              |
| **Auth**        | Bearer Token                     |
| **Path Params** | `userId`: Target user ID         |

---

#### POST /social/friend-request/accept/:requestId

| Field           | Value                                      |
| --------------- | ------------------------------------------ |
| **Method**      | POST                                       |
| **URL**         | `/social/friend-request/accept/:requestId` |
| **Description** | Accept friend request                      |
| **Auth**        | Bearer Token                               |
| **Path Params** | `requestId`: Request ID                    |

---

#### POST /social/block/:userId

| Field           | Value                    |
| --------------- | ------------------------ |
| **Method**      | POST                     |
| **URL**         | `/social/block/:userId`  |
| **Description** | Block a user             |
| **Auth**        | Bearer Token             |
| **Path Params** | `userId`: Target user ID |

---

#### POST /social/mute/:userId

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Method**      | POST                         |
| **URL**         | `/social/mute/:userId`       |
| **Description** | Mute a user (hides messages) |
| **Auth**        | Bearer Token                 |
| **Path Params** | `userId`: Target user ID     |

---

#### GET /social/messages/:friendId

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Method**      | GET                          |
| **URL**         | `/social/messages/:friendId` |
| **Description** | Get DM history with a friend |
| **Auth**        | Bearer Token                 |
| **Path Params** | `friendId`: Friend user ID   |

---

### 3.7 Rooms Routes (`/rooms`)

#### GET /rooms

| Field           | Value                   |
| --------------- | ----------------------- |
| **Method**      | GET                     |
| **URL**         | `/rooms`                |
| **Description** | List active voice rooms |
| **Auth**        | Public                  |

---

#### POST /rooms

| Field           | Value                   |
| --------------- | ----------------------- |
| **Method**      | POST                    |
| **URL**         | `/rooms`                |
| **Description** | Create a new voice room |
| **Auth**        | Bearer Token            |

**Request DTO:**

```json
{
  "name": "My Room",
  "isPrivate": false,
  "maxParticipants": 8
}
```

---

#### POST /rooms/:roomId/join

| Field           | Value                 |
| --------------- | --------------------- |
| **Method**      | POST                  |
| **URL**         | `/rooms/:roomId/join` |
| **Description** | Join a voice room     |
| **Auth**        | Bearer Token          |
| **Path Params** | `roomId`: Room ID     |

---

#### GET /rooms/:roomId/members

| Field           | Value                    |
| --------------- | ------------------------ |
| **Method**      | GET                      |
| **URL**         | `/rooms/:roomId/members` |
| **Description** | Get room members         |
| **Auth**        | Bearer Token             |

---

#### POST /rooms/:roomId/kick/:targetUserId

| Field           | Value                               |
| --------------- | ----------------------------------- |
| **Method**      | POST                                |
| **URL**         | `/rooms/:roomId/kick/:targetUserId` |
| **Description** | Kick user from room                 |
| **Auth**        | Bearer Token                        |
| **Roles**       | Moderator+                          |
| **Path Params** | `roomId`, `targetUserId`            |

---

#### POST /rooms/:roomId/ban/:targetUserId

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **Method**      | POST                               |
| **URL**         | `/rooms/:roomId/ban/:targetUserId` |
| **Description** | Ban user from room                 |
| **Auth**        | Bearer Token                       |
| **Roles**       | Moderator+                         |

---

### 3.8 Game Routes (`/matchmaking`)

#### POST /matchmaking/join

| Field           | Value                  |
| --------------- | ---------------------- |
| **Method**      | POST                   |
| **URL**         | `/matchmaking/join`    |
| **Description** | Join matchmaking queue |
| **Auth**        | Bearer Token           |

**Request DTO:**

```json
{
  "gameType": "ludo",
  "roomType": "public"
}
```

---

#### DELETE /matchmaking/leave

| Field           | Value                   |
| --------------- | ----------------------- |
| **Method**      | DELETE                  |
| **URL**         | `/matchmaking/leave`    |
| **Description** | Leave matchmaking queue |
| **Auth**        | Bearer Token            |

---

### 3.9 Meta-Game Routes (`/meta-game`)

#### GET /meta-game/daily-login

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Method**      | GET                           |
| **URL**         | `/meta-game/daily-login`      |
| **Description** | Get daily login streak status |
| **Auth**        | Bearer Token                  |

---

#### POST /meta-game/daily-login/claim

| Field           | Value                          |
| --------------- | ------------------------------ |
| **Method**      | POST                           |
| **URL**         | `/meta-game/daily-login/claim` |
| **Description** | Claim daily login reward       |
| **Auth**        | Bearer Token                   |

---

#### GET /meta-game/tasks

| Field           | Value              |
| --------------- | ------------------ |
| **Method**      | GET                |
| **URL**         | `/meta-game/tasks` |
| **Description** | Get all user tasks |
| **Auth**        | Bearer Token       |

---

#### POST /meta-game/tasks/:taskId/claim

| Field           | Value                            |
| --------------- | -------------------------------- |
| **Method**      | POST                             |
| **URL**         | `/meta-game/tasks/:taskId/claim` |
| **Description** | Claim completed task reward      |
| **Auth**        | Bearer Token                     |
| **Path Params** | `taskId`: Task ID                |

---

#### GET /meta-game/ranking/:gameType/leaderboard

| Field           | Value                                      |
| --------------- | ------------------------------------------ |
| **Method**      | GET                                        |
| **URL**         | `/meta-game/ranking/:gameType/leaderboard` |
| **Description** | Get game leaderboard                       |
| **Auth**        | Public                                     |
| **Path Params** | `gameType`: `ludo` or `domino`             |

---

### 3.10 Voice Routes (`/voice`)

#### GET /voice/token/:roomId

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **Method**      | GET                                |
| **URL**         | `/voice/token/:roomId`             |
| **Description** | Get Agora RTC token for voice room |
| **Auth**        | Bearer Token                       |
| **Path Params** | `roomId`: Room ID                  |

---

#### GET /voice/match/:matchId/token

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **Method**      | GET                                |
| **URL**         | `/voice/match/:matchId/token`      |
| **Description** | Get Agora RTC token for live match |
| **Auth**        | Bearer Token                       |
| **Path Params** | `matchId`: Match ID                |

---

### 3.11 Admin Routes (`/admin`)

#### 3.11.1 User Management

##### GET /admin/users

| Field            | Value                       |
| ---------------- | --------------------------- |
| **Method**       | GET                         |
| **URL**          | `/admin/users`              |
| **Description**  | List users with pagination  |
| **Auth**         | Bearer Token                |
| **Roles**        | ADMIN, SUPER_ADMIN          |
| **Permissions**  | MANAGE_USERS                |
| **Query Params** | `search`, `limit`, `offset` |

---

##### GET /admin/users/:id

| Field           | Value                  |
| --------------- | ---------------------- |
| **Method**      | GET                    |
| **URL**         | `/admin/users/:id`     |
| **Description** | Get detailed user info |
| **Auth**        | Bearer Token           |
| **Roles**       | ADMIN, SUPER_ADMIN     |
| **Permissions** | VIEW_USERS             |
| **Path Params** | `id`: User ID          |

---

##### POST /admin/users/:id/balance

| Field           | Value                           |
| --------------- | ------------------------------- |
| **Method**      | POST                            |
| **URL**         | `/admin/users/:id/balance`      |
| **Description** | Adjust user balance (Gold/Gems) |
| **Auth**        | Bearer Token                    |
| **Roles**       | ADMIN, SUPER_ADMIN              |
| **Permissions** | ADJUST_BALANCE                  |
| **Path Params** | `id`: User ID                   |

**Request DTO:**

```json
{
  "currency": "gold" | "gems",
  "amount": "1000",
  "action": "add" | "deduct",
  "reason": "Bonus reward"
}
```

---

#### 3.11.2 Roles & Permissions

##### GET /admin/roles

| Field           | Value                 |
| --------------- | --------------------- |
| **Method**      | GET                   |
| **URL**         | `/admin/roles`        |
| **Description** | List all system roles |
| **Auth**        | Bearer Token          |
| **Roles**       | ADMIN, SUPER_ADMIN    |
| **Permissions** | MANAGE_ROLES          |

---

##### POST /admin/roles

| Field           | Value                  |
| --------------- | ---------------------- |
| **Method**      | POST                   |
| **URL**         | `/admin/roles`         |
| **Description** | Create new system role |
| **Auth**        | Bearer Token           |
| **Roles**       | SUPER_ADMIN            |
| **Permissions** | MANAGE_ROLES           |

**Request DTO:**

```json
{
  "code": "MODERATOR",
  "name": "Moderator",
  "description": "Content moderator",
  "isDefault": false
}
```

---

##### POST /admin/users/:id/roles/assign

| Field           | Value                           |
| --------------- | ------------------------------- |
| **Method**      | POST                            |
| **URL**         | `/admin/users/:id/roles/assign` |
| **Description** | Assign role to user             |
| **Auth**        | Bearer Token                    |
| **Roles**       | SUPER_ADMIN                     |
| **Permissions** | MANAGE_ROLES                    |

**Request DTO:**

```json
{
  "roleCode": "MODERATOR"
}
```

---

##### POST /admin/users/:id/roles/revoke

| Field           | Value                           |
| --------------- | ------------------------------- |
| **Method**      | POST                            |
| **URL**         | `/admin/users/:id/roles/revoke` |
| **Description** | Revoke role from user           |
| **Auth**        | Bearer Token                    |
| **Roles**       | SUPER_ADMIN                     |

---

##### GET /admin/permissions

| Field           | Value                       |
| --------------- | --------------------------- |
| **Method**      | GET                         |
| **URL**         | `/admin/permissions`        |
| **Description** | List all system permissions |
| **Auth**        | Bearer Token                |
| **Roles**       | ADMIN, SUPER_ADMIN          |
| **Permissions** | MANAGE_PERMISSIONS          |

---

##### POST /admin/roles/:code/permissions/assign

| Field           | Value                                   |
| --------------- | --------------------------------------- |
| **Method**      | POST                                    |
| **URL**         | `/admin/roles/:code/permissions/assign` |
| **Description** | Link permission to role                 |
| **Auth**        | Bearer Token                            |
| **Roles**       | SUPER_ADMIN                             |

**Request DTO:**

```json
{
  "permissionCode": "VIEW_USERS"
}
```

---

##### POST /admin/roles/:code/permissions/revoke

| Field           | Value                                   |
| --------------- | --------------------------------------- |
| **Method**      | POST                                    |
| **URL**         | `/admin/roles/:code/permissions/revoke` |
| **Description** | Unlink permission from role             |
| **Auth**        | Bearer Token                            |
| **Roles**       | SUPER_ADMIN                             |

---

#### 3.11.3 Reports & Moderation

##### GET /reports

| Field           | Value                                  |
| --------------- | -------------------------------------- |
| **Method**      | GET                                    |
| **URL**         | `/reports`                             |
| **Description** | List all reports (staff only)          |
| **Auth**        | Bearer Token                           |
| **Roles**       | MODERATOR, ADMIN, SUPER_ADMIN, SUPPORT |

---

##### POST /reports/:id/action

| Field           | Value                         |
| --------------- | ----------------------------- |
| **Method**      | POST                          |
| **URL**         | `/reports/:id/action`         |
| **Description** | Take action on report         |
| **Auth**        | Bearer Token                  |
| **Roles**       | MODERATOR, ADMIN, SUPER_ADMIN |

**Request DTO:**

```json
{
  "action": "warn" | "mute" | "ban",
  "durationHours": 24,
  "reason": "Violation of rules"
}
```

---

#### 3.11.4 Support Tickets

##### GET /support/tickets

| Field           | Value                     |
| --------------- | ------------------------- |
| **Method**      | GET                       |
| **URL**         | `/support/tickets`        |
| **Description** | Get all support tickets   |
| **Auth**        | Bearer Token              |
| **Roles**       | ADMIN, MODERATOR, SUPPORT |

---

##### POST /support/tickets

| Field           | Value               |
| --------------- | ------------------- |
| **Method**      | POST                |
| **URL**         | `/support/tickets`  |
| **Description** | Open support ticket |
| **Auth**        | Bearer Token        |
| **Roles**       | User                |

**Request DTO:**

```json
{
  "subject": "Issue description",
  "category": "billing" | "bug" | "account" | "other",
  "message": "Detailed message"
}
```

---

#### 3.11.5 Refunds (Admin)

##### POST /admin/refunds/:purchaseId

| Field           | Value                        |
| --------------- | ---------------------------- |
| **Method**      | POST                         |
| **URL**         | `/admin/refunds/:purchaseId` |
| **Description** | Process full refund          |
| **Auth**        | Bearer Token                 |
| **Roles**       | ADMIN, SUPER_ADMIN           |
| **Permissions** | MANAGE_TICKETS               |

**Request DTO:**

```json
{
  "reason": "Customer request"
}
```

---

### 3.12 Reports Routes (`/reports`)

#### POST /reports

| Field           | Value             |
| --------------- | ----------------- |
| **Method**      | POST              |
| **URL**         | `/reports`        |
| **Description** | File a new report |
| **Auth**        | Bearer Token      |

**Request DTO:**

```json
{
  "targetType": "user" | "room" | "message",
  "targetId": "uuid",
  "reason": "harassment" | "cheating" | "spam" | "other",
  "description": "Detailed description"
}
```

---

#### GET /reports/me

| Field           | Value                  |
| --------------- | ---------------------- |
| **Method**      | GET                    |
| **URL**         | `/reports/me`          |
| **Description** | Get user's own reports |
| **Auth**        | Bearer Token           |

---

### 3.13 Moderation Routes (`/moderation`)

#### POST /moderation/users/:id/sanction

| Field           | Value                            |
| --------------- | -------------------------------- |
| **Method**      | POST                             |
| **URL**         | `/moderation/users/:id/sanction` |
| **Description** | Apply global sanction (ban/mute) |
| **Auth**        | Bearer Token                     |
| **Roles**       | ADMIN, SUPER_ADMIN               |
| **Permissions** | GLOBAL_BAN                       |

**Request DTO:**

```json
{
  "type": "ban" | "mute" | "warning",
  "reason": "Violation",
  "durationHours": 24
}
```

---

#### GET /moderation/users/:id/sanctions/active

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| **Method**      | GET                                      |
| **URL**         | `/moderation/users/:id/sanctions/active` |
| **Description** | Get active sanctions for user            |
| **Auth**        | Bearer Token                             |

---

### 3.14 Ranks Routes (`/ranks`)

#### GET /ranks/system

| Field           | Value                |
| --------------- | -------------------- |
| **Method**      | GET                  |
| **URL**         | `/ranks/system`      |
| **Description** | Get all system ranks |
| **Auth**        | Public               |

---

#### POST /ranks/system/assign

| Field           | Value                      |
| --------------- | -------------------------- |
| **Method**      | POST                       |
| **URL**         | `/ranks/system/assign`     |
| **Description** | Assign system rank to user |
| **Auth**        | Bearer Token               |
| **Roles**       | ADMIN, SUPER_ADMIN         |

---

#### GET /ranks/room/:roomId

| Field           | Value                 |
| --------------- | --------------------- |
| **Method**      | GET                   |
| **URL**         | `/ranks/room/:roomId` |
| **Description** | Get room ranks        |
| **Auth**        | Bearer Token          |

---

### 3.15 Configs Routes (`/configs`)

#### GET /configs

| Field           | Value                             |
| --------------- | --------------------------------- |
| **Method**      | GET                               |
| **URL**         | `/configs`                        |
| **Description** | Get parsed system config          |
| **Auth**        | Public                            |
| **Purpose**     | Game settings, rewards, economics |

---

#### GET /configs/flags

| Field           | Value                 |
| --------------- | --------------------- |
| **Method**      | GET                   |
| **URL**         | `/configs/flags`      |
| **Description** | Get all feature flags |
| **Auth**        | Public                |

---

#### POST /configs

| Field           | Value              |
| --------------- | ------------------ |
| **Method**      | POST               |
| **URL**         | `/configs`         |
| **Description** | Set config value   |
| **Auth**        | Bearer Token       |
| **Roles**       | ADMIN, SUPER_ADMIN |

---

### 3.16 Match History Routes (`/matches`)

#### GET /matches/history

| Field            | Value                         |
| ---------------- | ----------------------------- |
| **Method**       | GET                           |
| **URL**          | `/matches/history`            |
| **Description**  | Get match history             |
| **Auth**         | Bearer Token                  |
| **Query Params** | `limit`, `offset`, `gameType` |

---

#### GET /matches/history/:matchId

| Field           | Value                       |
| --------------- | --------------------------- |
| **Method**      | GET                         |
| **URL**         | `/matches/history/:matchId` |
| **Description** | Get full match details      |
| **Auth**        | Bearer Token                |

---

### 3.17 Private Match Routes

#### POST /matches/create

| Field           | Value                |
| --------------- | -------------------- |
| **Method**      | POST                 |
| **URL**         | `/matches/create`    |
| **Description** | Create private match |
| **Auth**        | Bearer Token         |

**Request DTO:**

```json
{
  "gameType": "ludo",
  "isInviteOnly": true
}
```

**Response:**

```json
{
  "matchId": "uuid",
  "roomCode": "ABCD12"
}
```

---

#### POST /matches/join-by-code

| Field           | Value                      |
| --------------- | -------------------------- |
| **Method**      | POST                       |
| **URL**         | `/matches/join-by-code`    |
| **Description** | Join private match by code |
| **Auth**        | Bearer Token               |

**Request DTO:**

```json
{
  "roomCode": "ABCD12"
}
```

---

### 3.18 Media Routes (`/media`)

#### GET /media

| Field           | Value                |
| --------------- | -------------------- |
| **Method**      | GET                  |
| **URL**         | `/media`             |
| **Description** | List all media files |
| **Auth**        | Public               |

---

#### GET /media/:id

| Field           | Value                |
| --------------- | -------------------- |
| **Method**      | GET                  |
| **URL**         | `/media/:id`         |
| **Description** | Get media file by ID |
| **Auth**        | Public               |

---

---

## 4. DTO Schemas

### Auth DTOs

#### RegisterDto

| Field    | Type   | Required | Validation               |
| -------- | ------ | -------- | ------------------------ |
| email    | string | Yes      | Valid email format       |
| password | string | Yes      | Min 8 chars              |
| username | string | Yes      | 3-20 chars, alphanumeric |

#### LoginDto

| Field    | Type   | Required |
| -------- | ------ | -------- |
| email    | string | Yes      |
| password | string | Yes      |

#### RefreshTokenDto

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| refreshToken | string | Yes      |

#### OtpRequestDto

| Field | Type   | Required |
| ----- | ------ | -------- |
| phone | string | Yes      |

#### OtpVerifyDto

| Field | Type   | Required |
| ----- | ------ | -------- |
| phone | string | Yes      |
| token | string | Yes      |

#### LinkAccountDto

| Field    | Type   | Required |
| -------- | ------ | -------- | ----------------------------- |
| provider | string | Yes      | Enum: facebook, google, phone |

---

### User DTOs

#### UpdateProfileDto

| Field    | Type   | Required | Validation                        |
| -------- | ------ | -------- | --------------------------------- |
| nickname | string | No       | Max 20 chars                      |
| title    | string | No       | Max 30 chars                      |
| avatar   | string | No       | URL                               |
| status   | string | No       | Enum: online, away, busy, offline |

---

### Store DTOs

#### PurchaseDto

| Field    | Type   | Required           |
| -------- | ------ | ------------------ |
| bundleId | string | Yes                |
| currency | string | No (default: gems) |

#### UseItemDto

| Field    | Type   | Required        |
| -------- | ------ | --------------- |
| quantity | number | No (default: 1) |

---

### Admin DTOs

#### AdjustBalanceDto

| Field    | Type   | Required | Validation     |
| -------- | ------ | -------- | -------------- |
| currency | string | Yes      | gold or gems   |
| amount   | string | Yes      | Numeric string |
| action   | string | Yes      | add or deduct  |
| reason   | string | Yes      | Max 200 chars  |

#### AssignRoleDto

| Field    | Type   | Required |
| -------- | ------ | -------- |
| roleCode | string | Yes      |

#### CreateRoleDto

| Field       | Type    | Required |
| ----------- | ------- | -------- |
| code        | string  | Yes      |
| name        | string  | Yes      |
| description | string  | No       |
| isDefault   | boolean | No       |

#### AssignPermissionDto

| Field          | Type   | Required |
| -------------- | ------ | -------- |
| permissionCode | string | Yes      |

#### CreatePermissionDto

| Field       | Type   | Required |
| ----------- | ------ | -------- |
| code        | string | Yes      |
| name        | string | Yes      |
| description | string | No       |

---

### Report DTOs

#### CreateReportDto

| Field       | Type   | Required | Enum                              |
| ----------- | ------ | -------- | --------------------------------- |
| targetType  | string | Yes      | user, room, message               |
| targetId    | string | Yes      | UUID                              |
| reason      | string | Yes      | harassment, cheating, spam, other |
| description | string | No       | Max 1000 chars                    |

---

### Support DTOs

#### CreateTicketDto

| Field    | Type   | Required | Enum                         |
| -------- | ------ | -------- | ---------------------------- |
| subject  | string | Yes      | Max 100 chars                |
| category | string | Yes      | billing, bug, account, other |
| message  | string | Yes      | Max 5000 chars               |

#### ReplyTicketDto

| Field   | Type   | Required |
| ------- | ------ | -------- |
| message | string | Yes      |

---

### Moderation DTOs

#### SanctionDto

| Field         | Type   | Required | Enum               |
| ------------- | ------ | -------- | ------------------ |
| type          | string | Yes      | ban, mute, warning |
| reason        | string | Yes      | Max 500 chars      |
| durationHours | number | No       | 1-8760             |

#### StrikeDto

| Field    | Type   | Required          |
| -------- | ------ | ----------------- |
| reason   | string | Yes               |
| severity | string | low, medium, high |

---

### Social DTOs

#### SendFriendRequestDto

| Field  | Type   | Required |
| ------ | ------ | -------- |
| userId | string | Yes      |

#### MessageDto

| Field   | Type   | Required |
| ------- | ------ | -------- | -------------- |
| message | string | Yes      | Max 2000 chars |

---

## 5. WebSocket Architecture

### Gateway Overview

| Attribute            | Value          |
| -------------------- | -------------- |
| **Namespace**        | `/events`      |
| **Transports**       | WebSocket only |
| **Ping Interval**    | 30s            |
| **Ping Timeout**     | 60s            |
| **Max Message Size** | 1MB            |

### Connection URL

```
Production: wss://api.viora.game/events
Development: ws://localhost:3001/events
```

### Authentication

JWT token passed in handshake auth:

```javascript
const socket = io('ws://localhost:3001/events', {
  auth: {
    token: 'eyJhbGciOiJIUzI1...',
  },
});
```

### Events

#### 5.1 Connection Events

##### connect

| Event        | Trigger                                                            |
| ------------ | ------------------------------------------------------------------ |
| **Name**     | `connect`                                                          |
| **Payload**  | `{ sid: string }`                                                  |
| **Frontend** | `socket.on('connect', () => console.log('connected', socket.id));` |

##### disconnect

| Event        | Trigger                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| **Name**     | `disconnect`                                                                |
| **Payload**  | `{ reason: string }`                                                        |
| **Frontend** | `socket.on('disconnect', (reason) => console.log('disconnected', reason));` |

---

#### 5.2 Game Events

##### game:state

| Event        | Trigger                                                  |
| ------------ | -------------------------------------------------------- |
| **Name**     | `game:state`                                             |
| **Payload**  | `{ matchId, state: GameState, turn, players }`           |
| **Trigger**  | Every game state change                                  |
| **Frontend** | `socket.on('game:state', (state) => updateGame(state));` |

##### game:move

| Event        | Trigger                                               |
| ------------ | ----------------------------------------------------- |
| **Name**     | `game:move`                                           |
| **Payload**  | `{ playerId, move, timestamp }`                       |
| **Trigger**  | Player makes a move                                   |
| **Frontend** | `socket.on('game:move', (move) => renderMove(move));` |

##### game:end

| Event        | Trigger                                                  |
| ------------ | -------------------------------------------------------- |
| **Name**     | `game:end`                                               |
| **Payload**  | `{ matchId, winner, rewards, stats }`                    |
| **Trigger**  | Match completed                                          |
| **Frontend** | `socket.on('game:end', (result) => showResult(result));` |

##### matchmaking:found

| Event        | Trigger                                                      |
| ------------ | ------------------------------------------------------------ |
| **Name**     | `matchmaking:found`                                          |
| **Payload**  | `{ matchId, roomCode }`                                      |
| **Trigger**  | Match found                                                  |
| **Frontend** | `socket.on('matchmaking:found', (m) => navigateToMatch(m));` |

##### matchmaking:cancelled

| Event       | Trigger                    |
| ----------- | -------------------------- |
| **Name**    | `matchmaking:cancelled`    |
| **Payload** | `{ reason }`               |
| **Trigger** | Match cancelled or timeout |

---

#### 5.3 Room Events

##### room:joined

| Event        | Trigger                                               |
| ------------ | ----------------------------------------------------- |
| **Name**     | `room:joined`                                         |
| **Payload**  | `{ roomId, members }`                                 |
| **Frontend** | `socket.on('room:joined', (room) => showRoom(room));` |

##### room:left

| Event       | Trigger      |
| ----------- | ------------ |
| **Name**    | `room:left`  |
| **Payload** | `{ roomId }` |

##### room:member:joined

| Event        | Trigger                                                 |
| ------------ | ------------------------------------------------------- |
| **Name**     | `room:member:joined`                                    |
| **Payload**  | `{ userId, username, member }`                          |
| **Frontend** | `socket.on('room:member:joined', (m) => addMember(m));` |

##### room:member:left

| Event       | Trigger            |
| ----------- | ------------------ |
| **Name**    | `room:member:left` |
| **Payload** | `{ userId }`       |

##### room:chat

| Event        | Trigger                                             |
| ------------ | --------------------------------------------------- |
| **Name**     | `room:chat`                                         |
| **Payload**  | `{ userId, message, timestamp }`                    |
| **Frontend** | `socket.on('room:chat', (msg) => appendChat(msg));` |

##### room:mute

| Event       | Trigger                |
| ----------- | ---------------------- |
| **Name**    | `room:mute`            |
| **Payload** | `{ userId, duration }` |

##### room:kick

| Event       | Trigger              |
| ----------- | -------------------- |
| **Name**    | `room:kick`          |
| **Payload** | `{ userId, reason }` |

##### room:ban

| Event       | Trigger              |
| ----------- | -------------------- |
| **Name**    | `room:ban`           |
| **Payload** | `{ userId, reason }` |

---

#### 5.4 Social Events

##### social:friend-request

| Event        | Trigger                                                          |
| ------------ | ---------------------------------------------------------------- |
| **Name**     | `social:friend-request`                                          |
| **Payload**  | `{ requestId, fromUser }`                                        |
| **Frontend** | `socket.on('social:friend-request', (req) => showRequest(req));` |

##### social:friend-accepted

| Event       | Trigger                  |
| ----------- | ------------------------ |
| **Name**    | `social:friend-accepted` |
| **Payload** | `{ friend }`             |

##### social:message

| Event        | Trigger                                                     |
| ------------ | ----------------------------------------------------------- |
| **Name**     | `social:message`                                            |
| **Payload**  | `{ fromUserId, message, timestamp }`                        |
| **Frontend** | `socket.on('social:message', (msg) => appendMessage(msg));` |

##### social:blocked

| Event       | Trigger          |
| ----------- | ---------------- |
| **Name**    | `social:blocked` |
| **Payload** | `{ userId }`     |

---

#### 5.5 Notification Events

##### notification:new

| Event        | Trigger                                                      |
| ------------ | ------------------------------------------------------------ |
| **Name**     | `notification:new`                                           |
| **Payload**  | `{ id, type, title, body, data }`                            |
| **Frontend** | `socket.on('notification:new', (n) => showNotification(n));` |

---

#### 5.6 System Events

##### user:online

| Event       | Trigger                        |
| ----------- | ------------------------------ |
| **Name**    | `user:online`                  |
| **Payload** | `{ userId, status }`           |
| **Trigger** | User comes online/goes offline |

##### user:profile-updated

| Event       | Trigger                |
| ----------- | ---------------------- |
| **Name**    | `user:profile-updated` |
| **Payload** | `{ userId, changes }`  |

##### admin:alert

| Event       | Trigger                   |
| ----------- | ------------------------- |
| **Name**    | `admin:alert`             |
| **Payload** | `{ type, message, data }` |
| **Roles**   | ADMIN, SUPER_ADMIN only   |

##### rate-limit:exceeded

| Event       | Trigger                  |
| ----------- | ------------------------ |
| **Name**    | `rate-limit:exceeded`    |
| **Payload** | `{ action, retryAfter }` |

---

### Client Actions (Emit)

#### 5.1 Game Actions

##### game:move

```javascript
socket.emit('game:move', {
  matchId: 'uuid',
  position: 5,
  // ... move data
});
```

##### game:chat

```javascript
socket.emit('game:chat', {
  matchId: 'uuid',
  message: 'Hello!',
});
```

---

#### 5.2 Room Actions

##### room:join

```javascript
socket.emit('room:join', { roomId: 'uuid' });
```

##### room:leave

```javascript
socket.emit('room:leave', { roomId: 'uuid' });
```

##### room:chat

```javascript
socket.emit('room:chat', {
  roomId: 'uuid',
  message: 'Hello everyone!',
});
```

---

#### 5.3 Social Actions

##### social:send-message

```javascript
socket.emit('social:send-message', {
  toUserId: 'uuid',
  message: 'Hi!',
});
```

---

#### 5.4 Matchmaking Actions

##### matchmaking:join

```javascript
socket.emit('matchmaking:join', {
  gameType: 'ludo',
  roomType: 'public',
});
```

##### matchmaking:leave

```javascript
socket.emit('matchmaking:leave');
```

---

### Rate Limiting

| Action           | Max per 10s |
| ---------------- | ----------- |
| game:move        | 30          |
| game:chat        | 20          |
| room_chat        | 30          |
| direct_message   | 15          |
| game_gift        | 5           |
| matchmaking_join | 5           |

---

## 6. Event-Driven System

### Event Emitters

All events emitted via NestJS EventEmitter2:

| Event               | Payload                                                      | Purpose            |
| ------------------- | ------------------------------------------------------------ | ------------------ |
| `audit.log.created` | `{ actionType, actorUserId, targetType, targetId, payload }` | Audit logging      |
| `user.created`      | `{ userId, email }`                                          | User welcome flow  |
| `notification.sent` | `{ userId, notification }`                                   | Push notifications |
| `payment.completed` | `{ userId, amount, currency }`                               | Payment processing |
| `inventory.updated` | `{ userId, itemId }`                                         | Cache invalidation |
| `rank.assigned`     | `{ userId, rankId }`                                         | Rank updates       |
| `sanction.applied`  | `{ userId, type, duration }`                                 | Moderation alerts  |

### Async Workflows

| Workflow           | Trigger          | Queue                 |
| ------------------ | ---------------- | --------------------- |
| Audit logging      | Any admin action | `audit_logs` queue    |
| Push notifications | User events      | `notifications` queue |
| Match rewards      | Game end         | `match_rewards` queue |
| Daily tasks        | Cron (hourly)    | `game_events` queue   |

---

## 7. Auth & Security

### JWT Authentication

| Attribute      | Value                                |
| -------------- | ------------------------------------ |
| **Algorithm**  | HS256                                |
| **Secret**     | `SUPABASE_JWT_SECRET` env var        |
| **Expiration** | 1 hour (access), 30 days (refresh)   |
| **Claims**     | `sub` (userId), `app_metadata.roles` |

### Guards

| Guard               | Purpose                     |
| ------------------- | --------------------------- |
| `SupabaseAuthGuard` | JWT Bearer token validation |
| `RolesGuard`        | Role-based access (RBAC)    |
| `PermissionsGuard`  | Permission-based access     |
| `WsAuthGuard`       | WebSocket JWT validation    |

### Roles Hierarchy

| Role        | Parent      | Permissions                                              |
| ----------- | ----------- | -------------------------------------------------------- |
| SUPER_ADMIN | -           | All permissions                                          |
| ADMIN       | SUPER_ADMIN | User management, roles, balance adjust, configs, refunds |
| MODERATOR   | ADMIN       | Reports, kicks, bans, mutes                              |
| SUPPORT     | MODERATOR   | Support tickets                                          |
| USER        | -           | Basic access                                             |

### Permissions

| Permission         | Description                |
| ------------------ | -------------------------- |
| MANAGE_USERS       | View/edit user details     |
| MANAGE_ROLES       | Create/assign/revoke roles |
| MANAGE_PERMISSIONS | Create/assign permissions  |
| MANAGE_TICKETS     | Process refunds            |
| ADJUST_BALANCE     | Add/deduct currency        |
| VIEW_USERS         | View user profiles         |
| GLOBAL_BAN         | Apply global sanctions     |

### Rate Limiting (HTTP)

| Endpoint        | Limit       |
| --------------- | ----------- |
| Auth (login)    | 10/minute   |
| Auth (register) | 5/minute    |
| API (general)   | 1000/minute |

---

## 8. Data Models

### Core Entities

#### User

| Field           | Type      | Description              |
| --------------- | --------- | ------------------------ |
| id              | UUID      | Primary key              |
| immutableUserId | UUID      | Unique, never changes    |
| email           | string    | Unique email             |
| username        | string    | Unique username          |
| globalNickname  | string    | username#NNNN            |
| nickname        | string?   | Display name             |
| avatar          | string?   | Avatar URL               |
| title           | string?   | Title                    |
| status          | enum      | online/offline/away/busy |
| createdAt       | timestamp | Creation time            |

#### UserRole

| Field      | Type              |
| ---------- | ----------------- |
| id         | UUID              |
| roleId     | UUID (FK to Role) |
| userId     | UUID (FK to User) |
| assignedAt | timestamp         |
| revokedAt  | timestamp?        |

#### Role

| Field       | Type            |
| ----------- | --------------- |
| id          | UUID            |
| code        | string (unique) |
| name        | string          |
| description | string?         |
| isDefault   | boolean         |

#### Permission

| Field       | Type            |
| ----------- | --------------- |
| id          | UUID            |
| code        | string (unique) |
| name        | string          |
| description | string?         |

#### Wallet

| Field  | Type             |
| ------ | ---------------- |
| id     | UUID             |
| userId | UUID (unique FK) |
| gold   | bigint           |
| gems   | bigint           |

#### Transaction

| Field     | Type                |
| --------- | ------------------- |
| id        | UUID                |
| userId    | UUID                |
| type      | enum (credit/debit) |
| currency  | enum (gold/gems)    |
| amount    | bigint              |
| reason    | string              |
| createdAt | timestamp           |

#### StoreItem

| Field     | Type                        |
| --------- | --------------------------- |
| id        | UUID                        |
| sku       | string                      |
| name      | string                      |
| type      | enum                        |
| priceGems | bigint?                     |
| isActive  | boolean                     |
| scope     | string? (profile/game/room) |
| slot      | string?                     |
| rarity    | enum                        |

#### UserInventory

| Field      | Type       |
| ---------- | ---------- |
| id         | UUID       |
| userId     | UUID       |
| itemId     | UUID (FK)  |
| isEquipped | boolean    |
| quantity   | number     |
| acquiredAt | timestamp  |
| expiresAt  | timestamp? |

#### Report

| Field      | Type                             |
| ---------- | -------------------------------- |
| id         | UUID                             |
| reporterId | UUID                             |
| targetType | enum                             |
| targetId   | UUID                             |
| reason     | enum                             |
| status     | enum (pending/reviewed/resolved) |
| createdAt  | timestamp                        |

#### SupportTicket

| Field     | Type                         |
| --------- | ---------------------------- |
| id        | UUID                         |
| userId    | UUID                         |
| subject   | string                       |
| category  | enum                         |
| status    | enum (open/pending/resolved) |
| createdAt | timestamp                    |
| updatedAt | timestamp                    |

#### Room

| Field           | Type    |
| --------------- | ------- |
| id              | UUID    |
| name            | string  |
| ownerId         | UUID    |
| isPrivate       | boolean |
| maxParticipants | number  |
| isActive        | boolean |

#### Game

| Field     | Type       |
| --------- | ---------- |
| id        | UUID       |
| gameType  | enum       |
| roomType  | enum       |
| status    | enum       |
| createdAt | timestamp  |
| endedAt   | timestamp? |

#### AuditLog

| Field       | Type      |
| ----------- | --------- |
| id          | UUID      |
| actorUserId | UUID?     |
| actionType  | string    |
| targetType  | string    |
| targetId    | UUID      |
| payload     | jsonb     |
| createdAt   | timestamp |

---

## 9. Frontend Integration Guide

### Base Configuration

```typescript
// API Base URL
const API_BASE = 'http://localhost:3001';
const WS_BASE = 'ws://localhost:3001/events';

// HTTP Client setup
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Token Handling

```typescript
// Store tokens
function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

// Get stored token
function getStoredToken() {
  return localStorage.getItem('accessToken');
}

// Refresh token automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      const { accessToken } = await api.post('/auth/refresh', { refreshToken });
      storeTokens(accessToken, refreshToken);
      error.config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  },
);
```

### WebSocket Connection

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket;

function connectSocket(token: string) {
  socket = io(WS_BASE, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
  });

  return socket;
}
```

### Common Integration Flows

#### 1. Login Flow

```typescript
async function login(email: string, password: string) {
  const response = await api.post('/auth/email/login', { email, password });
  const { accessToken, refreshToken, user } = response.data;
  storeTokens(accessToken, refreshToken);
  connectSocket(accessToken);
  return user;
}
```

#### 2. Bootstrap Data

```typescript
async function bootstrap() {
  const [profile, wallet, dailyLogin, loadout] = await Promise.all([
    api.get('/users/me'),
    api.get('/wallet'),
    api.get('/meta-game/daily-login'),
    api.get('/store/loadout/me/with-defaults'),
  ]);
  return {
    profile: profile.data,
    wallet: wallet.data,
    dailyLogin: dailyLogin.data,
    loadout: loadout.data,
  };
}
```

#### 3. Purchase Item

```typescript
async function purchaseItem(itemId: string) {
  const response = await api.post(`/store/purchase/item/${itemId}`);
  return response.data;
}
```

#### 4. Join Matchmaking

```typescript
async function joinMatchmaking(gameType: string) {
  await api.post('/matchmaking/join', { gameType, roomType: 'public' });

  // Listen for match found
  socket.on('matchmaking:found', (match) => {
    navigateToMatch(match.matchId);
  });
}
```

#### 5. Create Voice Room

```typescript
async function createRoom(name: string) {
  const response = await api.post('/rooms', { name });
  return response.data;
}
```

---

## 10. Error Handling

### Error Response Structure

```typescript
{
  statusCode: number,
  message: string,
  errorCode?: string
}
```

### HTTP Status Codes

| Status | Meaning               |
| ------ | --------------------- |
| 200    | OK                    |
| 201    | Created               |
| 400    | Bad Request           |
| 401    | Unauthorized          |
| 403    | Forbidden             |
| 404    | Not Found             |
| 409    | Conflict              |
| 422    | Unprocessable Entity  |
| 429    | Too Many Requests     |
| 500    | Internal Server Error |

### Error Codes

| Code                  | Description             |
| --------------------- | ----------------------- |
| INVALID_CREDENTIALS   | Login failed            |
| TOKEN_EXPIRED         | JWT expired             |
| USER_NOT_FOUND        | User doesn't exist      |
| ITEM_NOT_FOUND        | Store item missing      |
| INSUFFICIENT_BALANCE  | Not enough currency     |
| ALREADY_OWNED         | Item already owned      |
| CANNOT_EQUIP          | Item cannot be equipped |
| RATE_LIMITED          | Too many requests       |
| REPORT_ALREADY_EXISTS | Duplicate report        |
| TICKET_CLOSED         | Support ticket closed   |

### Validation Errors

```typescript
{
  statusCode: 400,
  message: "Validation failed",
  errorCode: "VALIDATION_ERROR",
  details: [
    { field: "email", message: "Invalid email format" },
    { field: "password", message: "Must be at least 8 characters" }
  ]
}
```

### Frontend Error Handling

```typescript
function handleApiError(error: ApiError) {
  switch (error.statusCode) {
    case 401:
      // Redirect to login
      redirect('/login');
      break;
    case 403:
      // Show forbidden message
      showToast('You do not have permission');
      break;
    case 422:
      // Show validation errors
      error.details.forEach((d) => showFieldError(d.field, d.message));
      break;
    case 429:
      // Show rate limit message
      const retryAfter = error.response?.headers['retry-after'];
      showToast(`Please wait ${retryAfter} seconds`);
      break;
    default:
      showToast('An error occurred');
  }
}
```

---

## 11. Real World Flows

### Flow 1: User Registration

```
1. POST /auth/email/register
   → Creates user in Supabase Auth
   → Creates User record in DB
   → Creates Wallet (0 gold, 0 gems)
   → Returns accessToken + refreshToken

2. GET /users/me/bootstrap
   → Returns profile + wallet + daily login + loadout

3. GET /configs
   → Returns system configuration
```

### Flow 2: Daily Login Rewards

```
1. GET /meta-game/daily-login
   → Returns streak count, eligible flag

2. If eligible:
   POST /meta-game/daily-login/claim
   → Adds reward to wallet
   → Increments streak
   → Updates last login time

3. Emit notification:new (via WebSocket)
```

### Flow 3: Matchmaking & Game

```
1. POST /matchmaking/join
   → Adds user to queue
   → Subscribes to matchmaking:found event

2. Socket event: matchmaking:found
   → Returns matchId, roomCode

3. GET /matches/history/:matchId
   → Gets full game state

4. WebSocket: game:state
   → Real-time game updates

5. Game ends: game:end
   → Saves match to history
   → Awards rewards (if applicable)
   → Updates leaderboard
```

### Flow 4: Purchase Store Item

```
1. GET /store/items
   → Shows available items with owned flag

2. POST /store/purchase/item/:itemId
   → Deducts gems from wallet
   → Creates UserInventory record
   → Logs purchase
   → Returns inventory item

3. GET /store/inventory
   → Shows updated inventory
```

### Flow 5: Admin User Ban

```
1. POST /admin/users/:id/balance (optional)
   → Admin adjusts balance

2. POST /moderation/users/:id/sanction
   → Creates UserSanction (ban)
   → Invalidates user sessions
   → Logs to audit

3. POST /reports/:id/action
   → Updates report status
   → Notifies reporter (optional)
```

### Flow 6: Support Ticket

```
1. POST /support/tickets
   → Creates SupportTicket
   → Returns ticket ID

2. GET /support/tickets/:id
   → Gets ticket + messages

3. POST /support/tickets/:id/reply
   → Adds message to ticket

4. Admin updates status:
   POST /support/tickets/:id/status
   → Updates status
```

---

## Appendix: Environment Variables

| Variable              | Required | Description                 |
| --------------------- | -------- | --------------------------- |
| PORT                  | No       | Server port (default: 3001) |
| DB_HOST               | Yes      | PostgreSQL host             |
| DB_PORT               | Yes      | PostgreSQL port             |
| DB_USERNAME           | Yes      | DB username                 |
| DB_PASSWORD           | Yes      | DB password                 |
| DB_NAME               | Yes      | Database name               |
| SUPABASE_URL          | Yes      | Supabase URL                |
| SUPABASE_KEY          | Yes      | Supabase anon key           |
| SUPABASE_JWT_SECRET   | Yes      | JWT signing secret          |
| FIREBASE_PROJECT_ID   | No       | Firebase project for push   |
| FIREBASE_PRIVATE_KEY  | No       | Firebase private key        |
| AGORA_APP_ID          | No       | Agora RTC app ID            |
| AGORA_APP_CERTIFICATE | No       | Agora RTC certificate       |
| REDIS_URL             | No       | Redis connection URL        |

---

## Appendix: Swagger Documentation

Access Swagger UI at: `/docs`

Access OpenAPI JSON at: `/docs/json`

---

_End of API Contract Document_
