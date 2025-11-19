# API Routes Documentation

This directory contains all REST API route handlers for the Sui Patreon backend.

## Overview

All API endpoints are mounted under the `/api` prefix and return JSON responses with consistent error handling.

### Response Format

**Success:**
```json
{
  // Resource data
}
```

**Error:**
```json
{
  "error": "Error message"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Creators API (`/api/creators`)

### GET `/api/creators/:address`

Get a creator by their Sui wallet address.

**Parameters:**
- `address` (path): Creator's Sui wallet address (66 chars, starts with 0x)

**Response:**
```json
{
  "id": "uuid",
  "address": "0x...",
  "profileId": "0x...",
  "name": "alice.sui",
  "bio": "Digital artist and creator",
  "avatarUrl": "https://...",
  "createdAt": "2025-01-18T...",
  "updatedAt": "2025-01-18T...",
  "tiers": [
    {
      "id": "uuid",
      "tierId": "0x...",
      "name": "Basic",
      "description": "Basic tier",
      "price": "1000000000",
      "isActive": true,
      "createdAt": "2025-01-18T..."
    }
  ],
  "contents": [
    {
      "id": "uuid",
      "contentId": "0x...",
      "title": "My First Post",
      "description": "...",
      "contentType": "text/markdown",
      "sealedPatchId": "...",
      "previewPatchId": "...",
      "isPublic": false,
      "createdAt": "2025-01-18T...",
      "contentTiers": [
        {
          "tier": {
            "id": "uuid",
            "name": "Premium"
          }
        }
      ]
    }
  ]
}
```

**Errors:**
- `404` - Creator not found

---

### GET `/api/creators`

Search for creators by name.

**Query Parameters:**
- `query` (optional): Search term for creator name (case-insensitive)
- `limit` (optional): Maximum results (default: 20, max: 100)

**Examples:**
- `/api/creators` - Get all creators (limit 20)
- `/api/creators?query=alice` - Search for creators named "alice"
- `/api/creators?limit=50` - Get 50 creators

**Response:**
```json
[
  {
    "id": "uuid",
    "address": "0x...",
    "name": "alice.sui",
    "bio": "...",
    "avatarUrl": "...",
    "tiers": [...]
  }
]
```

---

### GET `/api/creators/:address/content`

Get all content for a specific creator.

**Parameters:**
- `address` (path): Creator's Sui wallet address

**Response:**
```json
[
  {
    "id": "uuid",
    "contentId": "0x...",
    "creatorId": "uuid",
    "title": "Content Title",
    "description": "...",
    "contentType": "video/mp4",
    "sealedPatchId": "...",
    "isPublic": false,
    "createdAt": "2025-01-18T...",
    "contentTiers": [
      {
        "tier": {
          "id": "uuid",
          "tierId": "0x...",
          "name": "Premium",
          "price": "5000000000"
        }
      }
    ]
  }
]
```

**Errors:**
- `404` - Creator not found

---

## Tiers API (`/api/tiers`)

### GET `/api/tiers/:tierId`

Get a subscription tier by its Sui object ID.

**Parameters:**
- `tierId` (path): Tier's Sui object ID

**Response:**
```json
{
  "id": "uuid",
  "tierId": "0x...",
  "creatorId": "uuid",
  "name": "Premium",
  "description": "Premium tier with exclusive content",
  "price": "5000000000",
  "isActive": true,
  "createdAt": "2025-01-18T...",
  "creator": {
    "id": "uuid",
    "name": "alice.sui",
    "address": "0x..."
  },
  "_count": {
    "subscriptions": 42
  }
}
```

**Errors:**
- `404` - Tier not found

**Note:** Price is in MIST (1 SUI = 1,000,000,000 MIST)

---

## Subscriptions API (`/api/subscriptions`)

### GET `/api/subscriptions/:address`

Get all active subscriptions for a user.

**Parameters:**
- `address` (path): Subscriber's Sui wallet address

**Response:**
```json
[
  {
    "id": "uuid",
    "subscriptionId": "0x...",
    "subscriber": "0x...",
    "tierId": "uuid",
    "startsAt": "2025-01-18T...",
    "expiresAt": "2025-02-18T...",
    "isActive": true,
    "createdAt": "2025-01-18T...",
    "tier": {
      "id": "uuid",
      "name": "Premium",
      "price": "5000000000",
      "creator": {
        "id": "uuid",
        "name": "alice.sui",
        "address": "0x..."
      }
    }
  }
]
```

**Notes:**
- Only returns active, non-expired subscriptions
- Automatically filters out expired subscriptions

---

## Content API (`/api/content`)

### GET `/api/content/:contentId`

Get content by its Sui object ID.

**Parameters:**
- `contentId` (path): Content's Sui object ID

**Response:**
```json
{
  "id": "uuid",
  "contentId": "0x...",
  "creatorId": "uuid",
  "title": "My Video Tutorial",
  "description": "Learn how to...",
  "contentType": "video/mp4",
  "sealedPatchId": "walrus_blob_123",
  "previewPatchId": "walrus_preview_456",
  "isPublic": false,
  "createdAt": "2025-01-18T...",
  "creator": {
    "id": "uuid",
    "name": "alice.sui",
    "address": "0x..."
  },
  "contentTiers": [
    {
      "tier": {
        "id": "uuid",
        "tierId": "0x...",
        "name": "Premium",
        "price": "5000000000"
      }
    }
  ]
}
```

**Errors:**
- `404` - Content not found

---

### GET `/api/content/:contentId/access`

Check if a user has access to specific content.

**Parameters:**
- `contentId` (path): Content's Sui object ID
- `address` (query, required): User's Sui wallet address

**Examples:**
- `/api/content/0xabc.../access?address=0x123...`

**Response (Has Access):**
```json
{
  "hasAccess": true,
  "reason": "Active subscription to Premium"
}
```

**Response (No Access):**
```json
{
  "hasAccess": false,
  "reason": "No active subscription to required tier"
}
```

**Response (Public Content):**
```json
{
  "hasAccess": true,
  "reason": "Content is public"
}
```

**Errors:**
- `400` - Missing or invalid address parameter
- `404` - Content not found

**Access Logic:**
1. If content is public (`isPublic: true`), access granted
2. If content has no tier requirements, access granted
3. If user has active subscription to any required tier, access granted
4. Otherwise, access denied

---

## Data Types

### BigInt Serialization

All price fields (stored as `BigInt` in database) are automatically serialized to strings in JSON responses.

**Example:**
```json
{
  "price": "5000000000"  // String, not number
}
```

**Converting in Client:**
```typescript
const priceInSUI = Number(tier.price) / 1_000_000_000;
```

### Dates

All timestamps are in ISO 8601 format:
```json
{
  "createdAt": "2025-01-18T12:34:56.789Z"
}
```

### Sui Addresses & Object IDs

- Format: 66 characters, starts with `0x`
- Example: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

---

## Error Handling

All routes implement consistent error handling:

**Database Errors:**
```json
{
  "error": "Internal server error"
}
```

**Validation Errors:**
```json
{
  "error": "Invalid parameters: address query parameter required"
}
```

**Not Found Errors:**
```json
{
  "error": "Creator not found"
}
```

---

## Testing

Run integration tests:
```bash
bun test src/routes/creators.test.ts
```

Manual API testing:
```bash
bun src/routes/api-test.ts
```

---

## Architecture

### File Structure

```
routes/
├── README.md              # This file
├── creators.ts            # Creator endpoints
├── tiers.ts               # Tier endpoints
├── subscriptions.ts       # Subscription endpoints
├── content.ts             # Content endpoints
├── creators.test.ts       # Integration tests
└── api-test.ts            # Manual testing script
```

### Dependencies

- **Prisma Client** (`../lib/prisma`): Database access
- **JSON Serializer** (`../lib/json-serializer`): BigInt handling
- **Validation** (`../lib/validation`): Input validation

### Middleware Chain

1. CORS (configured in `src/index.ts`)
2. Body parsing (JSON, 50MB limit)
3. Route handlers
4. Error handler (global)

---

## Security Considerations

### Input Validation

- All route parameters are validated
- Search queries are sanitized to prevent SQL injection
- Limit parameters are bounded (max 100)

### CORS

CORS is configured to allow requests from the frontend URL only:
```typescript
origin: process.env.FRONTEND_URL || 'http://localhost:3000'
```

### Rate Limiting

**Not implemented yet** - recommended for production:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Authentication

**Not implemented yet** - endpoints are public read-only. Future enhancements:
- JWT authentication for write operations
- Signature verification for Sui wallet ownership
- API key authentication for third-party integrations

---

## Future Enhancements

- [ ] Pagination with cursor-based approach
- [ ] Advanced filtering (by tier price, content type, etc.)
- [ ] Sorting options
- [ ] Field selection (GraphQL-style sparse fieldsets)
- [ ] Caching with Redis
- [ ] Rate limiting
- [ ] Authentication & authorization
- [ ] Webhooks for blockchain events
- [ ] Analytics endpoints (trending creators, popular content)
- [ ] Batch operations
