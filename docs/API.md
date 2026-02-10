# GuideRail API Reference

Internal API specification for GuideRail platform.

**Base URL:** `/api`
**Authentication:** All endpoints require Clerk authentication (via session cookie or Bearer token).

---

## Programs

### List Programs
```
GET /api/programs
```
Returns all programs owned by the authenticated creator.

**Response:**
```json
[
  {
    "id": "cuid",
    "title": "string",
    "durationWeeks": 6,
    "published": false
  }
]
```

### Create Program
```
POST /api/programs/create
```
Creates a new draft program.

**Response:** `201 Created`
```json
{
  "id": "cuid",
  "title": "Untitled Program",
  "slug": "untitled-program-abc123",
  "durationWeeks": 6,
  "published": false
}
```

### Get Program
```
GET /api/programs/:id
```
Returns full program with structure (weeks, sessions, actions) and videos.

**Response:**
```json
{
  "id": "cuid",
  "title": "string",
  "slug": "string",
  "description": "string | null",
  "outcomeStatement": "string | null",
  "durationWeeks": 6,
  "priceInCents": 0,
  "currency": "usd",
  "published": false,
  "videos": [...],
  "weeks": [
    {
      "id": "cuid",
      "title": "Week 1",
      "weekNumber": 1,
      "sessions": [
        {
          "id": "cuid",
          "title": "Session 1",
          "orderIndex": 0,
          "actions": [
            {
              "id": "cuid",
              "title": "Watch Video",
              "type": "WATCH",
              "instructions": "string | null",
              "reflectionPrompt": "string | null",
              "youtubeVideoId": "string | null",
              "orderIndex": 0
            }
          ]
        }
      ]
    }
  ]
}
```

### Update Program
```
PATCH /api/programs/:id
```
Updates program metadata.

**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "outcomeStatement": "string (optional)",
  "durationWeeks": "number (optional)",
  "priceInCents": "number (optional)"
}
```

**Response:** Updated program object.

### Publish Program
```
POST /api/programs/:id/publish
```
Publishes the program. Creates Stripe product/price if not exists.

**Response:**
```json
{
  "id": "cuid",
  "published": true,
  "slug": "program-slug",
  "stripeProductId": "prod_xxx",
  "stripePriceId": "price_xxx"
}
```

---

## Weeks

### Create Week
```
POST /api/programs/:id/weeks
```

**Request Body:**
```json
{
  "title": "string (optional, defaults to 'Week N')",
  "weekNumber": "number (optional, auto-increments)"
}
```

**Response:** `201 Created` - Week object with empty sessions array.

### Update Week
```
PATCH /api/programs/:id/weeks/:weekId
```

**Request Body:**
```json
{
  "title": "string (optional)",
  "summary": "string (optional)"
}
```

### Delete Week
```
DELETE /api/programs/:id/weeks/:weekId
```
Cascade deletes all sessions and actions.

### Reorder Weeks
```
PATCH /api/programs/:id/weeks/reorder
```

**Request Body:**
```json
{
  "weekIds": ["week1", "week2", "week3"]
}
```

---

## Sessions

### Create Session
```
POST /api/programs/:id/weeks/:weekId/sessions
```

**Request Body:**
```json
{
  "title": "string (optional, defaults to 'Session N')"
}
```

**Response:** `201 Created` - Session object with empty actions array.

### Update Session
```
PATCH /api/programs/:id/sessions/:sessionId
```

**Request Body:**
```json
{
  "title": "string (optional)",
  "summary": "string (optional)"
}
```

### Delete Session
```
DELETE /api/programs/:id/sessions/:sessionId
```
Cascade deletes all actions.

### Reorder Sessions
```
PATCH /api/programs/:id/weeks/:weekId/sessions/reorder
```

**Request Body:**
```json
{
  "sessionIds": ["session1", "session2"]
}
```

---

## Actions

### Create Action
```
POST /api/programs/:id/sessions/:sessionId/actions
```

**Request Body:**
```json
{
  "title": "string (optional)",
  "type": "WATCH | READ | DO | REFLECT (required)"
}
```

**Response:** `201 Created` - Action object.

### Update Action
```
PATCH /api/programs/:id/actions/:actionId
```

**Request Body:**
```json
{
  "title": "string (optional)",
  "type": "WATCH | READ | DO | REFLECT (optional)",
  "instructions": "string (optional)",
  "reflectionPrompt": "string (optional)",
  "youtubeVideoId": "string (optional)"
}
```

### Delete Action
```
DELETE /api/programs/:id/actions/:actionId
```

### Reorder Actions
```
PATCH /api/programs/:id/sessions/:sessionId/reorder
```

**Request Body:**
```json
{
  "actionIds": ["action1", "action2"]
}
```

---

## Videos

### Add Video
```
POST /api/programs/:id/videos
```

**Request Body:**
```json
{
  "url": "https://youtube.com/watch?v=xxx"
}
```

**Response:** `201 Created`
```json
{
  "id": "cuid",
  "videoId": "youtube-id",
  "title": "Video Title",
  "thumbnailUrl": "https://...",
  "description": "..."
}
```

---

## AI Generation

### Auto-Structure (Embeddings + Clustering)
```
POST /api/programs/:id/auto-structure
```
Generates embeddings for videos and clusters them by topic.

**Requires:** At least one video added to program.

**Response:**
```json
{
  "programId": "cuid",
  "clusters": [
    {
      "clusterId": 0,
      "videoIds": ["vid1", "vid2"],
      "videoTitles": ["Title 1", "Title 2"]
    }
  ]
}
```

### Generate Program Draft
```
POST /api/programs/:id/generate
```
Uses LLM to generate full program structure from clusters.

**Requires:** Auto-structure must be run first.

**Response:**
```json
{
  "draftId": "cuid",
  "draft": {
    "programId": "cuid",
    "title": "...",
    "weeks": [...]
  }
}
```

---

## Enrollment & Payments

### Create Checkout Session
```
POST /api/checkout/:programId
```
Creates Stripe checkout session or free enrollment.

**Response (paid):**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Response (free):**
```json
{
  "enrolled": true,
  "programId": "cuid"
}
```

### Stripe Webhook
```
POST /api/webhooks/stripe
```
Handles `checkout.session.completed` events to create entitlements.

---

## Learner Progress

### Get Progress
```
GET /api/progress?programId=xxx
```
Returns learner's progress for a program.

**Response:**
```json
[
  {
    "actionId": "cuid",
    "completed": true,
    "completedAt": "2024-01-15T10:00:00Z",
    "reflectionText": "My reflection..."
  }
]
```

### Update Progress
```
POST /api/progress
```

**Request Body:**
```json
{
  "actionId": "cuid",
  "completed": true,
  "reflectionText": "string (optional)"
}
```

---

## User

### Get/Update Onboarding
```
GET /api/user/onboarding
```
Returns current onboarding state.

```
PATCH /api/user/onboarding
```

**Request Body:**
```json
{
  "name": "string",
  "bio": "string",
  "niche": "string",
  "outcomeTarget": "string"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "detail": "Optional details (for debugging)"
}
```

**Common Status Codes:**
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error
- `502` - External service error (AI, Stripe)

---

## Types

### ActionType
```typescript
type ActionType = "WATCH" | "READ" | "DO" | "REFLECT"
```

### Role
```typescript
type Role = "CREATOR" | "LEARNER" | "ADMIN"
```

### EntitlementStatus
```typescript
type EntitlementStatus = "ACTIVE" | "REVOKED" | "EXPIRED"
```
