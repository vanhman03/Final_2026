# Edge Functions API Documentation

## Overview

BrightSpark Kids backend uses Supabase Edge Functions (Deno runtime) for server-side logic that cannot be handled directly in the frontend.

## Base URL

- **Local Development:** `http://localhost:54321/functions/v1/`
- **Production:** `https://lhygwavdwdpvqplevepp.supabase.co/functions/v1/`

## Authentication

Most Edge Functions require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Some functions (like `payment-webhook`) do not require JWT but use alternative verification methods.

---

## 1. Payment Webhook

Handles VNPay payment confirmations.

### Endpoint
```
POST /payment-webhook
```

### Authentication
No JWT required (signature verification instead)

### Request Body
```json
{
  "vnp_TxnRef": "ORDER123",
  "vnp_Amount": "1000000",
  "vnp_BankCode": "NCB",
  "vnp_ResponseCode": "00",
  "vnp_TransactionNo": "14123456",
  "vnp_SecureHash": "abc123..."
}
```

### Response
```json
{
  "success": true,
  "message": "Payment completed",
  "data": {
    "orderId": "uuid",
    "status": "completed",
    "transactionNo": "14123456"
  }
}
```

### Status Codes
- `200` - Payment processed successfully
- `401` - Invalid signature
- `404` - Order not found
- `500` - Server error

---

## 2. Send Email

Sends transactional emails for various events.

### Endpoint
```
POST /send-email
```

### Authentication
Requires valid JWT token

### Request Body
```json
{
  "to": "user@example.com",
  "subject": "Welcome to BrightSpark Kids",
  "type": "welcome",
  "data": {
    "name": "John Doe"
  }
}
```

### Email Types
- `welcome` - Welcome email for new users
- `order_confirmation` - Order confirmation email
- `password_reset` - Password reset link
- `achievement` - Achievement/badge notification

### Response
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "emailId": "abc123",
    "type": "welcome",
    "recipient": "user@example.com"
  }
}
```

### Status  Codes
- `200` - Email sent successfully
- `400` - Invalid request
- `401` - Unauthorized
- `500` - Email service error

---

## 3. Analytics

Provides analytics calculations for dashboard and user statistics.

### Endpoints

#### Get Dashboard Analytics (Admin Only)
```
GET /analytics/dashboard
```

**Response:**
```json
{
  "overview": {
    "totalUsers": 1234,
    "totalVideos": 500,
    "totalOrders": 456,
    "totalRevenue": 123456000,
    "activeUsers": 234
  },
  "popularVideos": [...],
  "recentOrders": [...],
  "generatedAt": "2025-01-02T15:00:00Z"
}
```

#### Get User Analytics
```
GET /analytics/{userId}
```

**Response:**
```json
{
  "profile": {...},
  "children": [...],
  "screenTime": {
    "byDay": {"2025-01-01": 3600},
    "total": 86400,
    "logs": [...]
  },
  "gameActivity": {
    "stats": {
      "totalGamesPlayed": 45,
      "totalTimeSpent": 7200,
      "averageScore": 85
    },
    "recent": [...]
  },
  "favorites": [...],
  "generatedAt": "2025-01-02T15:00:00Z"
}
```

### Authentication
- Dashboard analytics requires admin role
- User analytics accessible by user or admin

### Status Codes
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not admin or wrong user)
- `500` - Server error

---

## 4. Admin Tools

Admin-only operations for bulk actions and maintenance.

### Endpoints

#### Bulk Import Videos
```
POST /admin-tools/bulk-import-videos
```

**Request:**
```json
{
  "videos": [
    {
      "youtube_video_id": "dQw4w9WgXcQ",
      "title": "ABC Song",
      "category": "Alphabet",
      "age_group": "3-5",
      "duration": "3:32",
      "language": "en"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "successful": 45,
    "failed": 5,
    "errors": ["Video1: Already exists"]
  }
}
```

#### Export Data
```
POST /admin-tools/data-export
```

**Response:**
```json
{
  "success": true,
  "message": "Data export successful",
  "data": {
    "users": [...],
    "videos": [...],
    "orders": [...],
    "children": [...],
    "exportedAt": "2025-01-02T15:00:00Z",
    "exportedBy": "admin-user-id"
  }
}
```

#### Cleanup Orphaned Data
```
DELETE /admin-tools/cleanup-orphaned-data
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "data": {
    "orphanedFavorites": 12,
    "orphanedPlaylists": 3,
    "orphanedScreenTimeLogs": 45
  }
}
```

### Authentication
Requires admin role

### Status Codes
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `500` - Server error

---

## Error Responses

All Edge Functions return errors in a consistent format:

```json
{
  "error": "Error message",
  "details": {...}
}
```

## Rate Limiting

Edge Functions are rate-limited by Supabase:
- **Anonymous requests:** 100 requests per hour
- **Authenticated requests:** 1000 requests per hour

## Testing

### Using curl
```bash
# Test payment webhook
curl -X POST http://localhost:54321/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"vnp_TxnRef":"TEST","vnp_ResponseCode":"00","vnp_SecureHash":"test"}'

# Test send email (with JWT)
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","type":"welcome"}'
```

### Using TypeScript/JavaScript
```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    type: 'welcome',
    data: { name: 'John' }
  }
});
```

## Monitoring & Logs

View Edge Function logs:
```bash
supabase functions logs payment-webhook
```

Or in Supabase Dashboard:
`Functions > [Function Name] > Logs`
