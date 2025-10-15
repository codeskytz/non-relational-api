---

# CodeSkyTZ unrelational API


A lightweight RESTful API providing AI-generated daily life quotes (powered by Gemini 2.0 Flash) and a simple Todo manager backed by PostgreSQL.

---
[![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-purple?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-orange?style=flat-square&logo=google)](https://ai.google.dev/)

---

## Base URL

- **Production**: https://api.codeskytz.site
- **Local Development**: http://localhost:3000

All endpoints support CORS and return JSON responses. HTTP status codes indicate success or errors (e.g., 200 OK, 404 Not Found, 500 Internal Server Error).

## Authentication

All API endpoints require authentication using the `codeskytz-api-key` header. You must include this header in all requests:

```
codeskytz-api-key: your-api-key-here
```

### Authentication Errors
- **401 Unauthorized**: Missing `codeskytz-api-key` header
- **403 Forbidden**: Invalid API key provided

---

## Endpoints

### 1. GET /life
Retrieves an AI-generated motivational quote.

#### Request
```bash
curl -X GET https://api.codeskytz.site/life \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Response (200 OK)
```json
{
  "quote": "Every sunrise resets your code—rewrite your destiny clean and fresh.",
  "mood": "inspirational",
  "author": "Gemini Neural Forge"
}
```

#### Error Example (500 Internal Server Error)
```json
{
  "error": "Neural net glitched—try again.",
  "code": "AI_DOWN"
}
```

### 2. GET /todos
Retrieves all Todo items.

#### Request
```bash
curl -X GET https://api.codeskytz.site/todos \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Response (200 OK)
```json
[
  {
    "id": 1,
    "title": "Finish CodeSkyTZ AI API",
    "status": "done",
    "created_at": "2025-10-12T15:42:11.000Z"
  },
  {
    "id": 2,
    "title": "Build client dashboard",
    "status": "not yet",
    "created_at": "2025-10-12T15:45:09.000Z"
  }
]
```

#### Error Example
```json
{
  "error": "Database connection failed.",
  "code": "DB_ERROR"
}
```

### 3. POST /todos
Creates a new Todo item. Requires a `title` in the request body.

#### Request
```bash
curl -X POST https://api.codeskytz.site/todos \
  -H "Content-Type: application/json" \
  -H "codeskytz-api-key: your-api-key-here" \
  -d '{"title": "Hack the planet"}'
```

#### Response (201 Created)
```json
{
  "id": 3,
  "title": "Hack the planet",
  "status": "not yet",
  "created_at": "2025-10-12T16:00:00.000Z"
}
```

#### Error Example (400 Bad Request)
```json
{
  "error": "Title is required.",
  "code": "VALIDATION_FAIL"
}
```

### 4. PATCH /todos/:id
Updates the status of a Todo item ("done" or "not yet").

#### Request
```bash
curl -X PATCH https://api.codeskytz.site/todos/3 \
  -H "Content-Type: application/json" \
  -H "codeskytz-api-key: your-api-key-here" \
  -d '{"status": "done"}'
```

#### Response (200 OK)
```json
{
  "id": 3,
  "title": "Hack the planet",
  "status": "done",
  "created_at": "2025-10-12T16:00:00.000Z"
}
```

#### Error Example (404 Not Found)
```json
{
  "error": "Todo not found.",
  "code": "TODO_NOT_FOUND"
}
```

### 5. DELETE /todos/:id
Deletes a Todo item by ID.

#### Request
```bash
curl -X DELETE https://api.codeskytz.site/todos/3 \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Todo deleted successfully."
}
```

#### Error Example (404 Not Found)
```json
{
  "error": "Todo not found.",
  "code": "TODO_NOT_FOUND"
}
```

No rate limits are currently enforced.

---

## Tech Stack

- Node.js + Express.js: Backend framework
- Gemini 2.0 Flash API: AI quote generation
- PostgreSQL (Kinsta Cloud): Database
- dotenv: Environment variable management
- Joi: Request validation

Includes error handling middleware and console logging.

---

## Local Development Setup

### Prerequisites
- Node.js v20 or higher
- PostgreSQL (local instance or Kinsta Cloud)
- Git

### Installation
```bash
git clone https://github.com/codeskytz/life-api.git
cd life-api
npm install
```

### Environment Configuration
Create a `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key
CODESKYTZ_API_KEY=your_api_key_here
PORT=3000
DB_CONNECTION=postgresql://user:pass@localhost:5432/life_db
```

**Required Environment Variables:**
- `GEMINI_API_KEY`: Your Google Gemini AI API key for quote generation
- `CODESKYTZ_API_KEY`: Your custom API key for authenticating requests
- `PORT`: Port number for the server (default: 3000)
- `DB_CONNECTION`: PostgreSQL connection string (for local development)

### Database Setup
This project uses database migrations for schema management. To set up the database:

1. **Run migrations** to create the required tables:
```bash
npx db-migrate up
```

2. **To rollback** (if needed):
```bash
npx db-migrate down
```

3. **Create new migrations**:
```bash
npx db-migrate create your-migration-name --sql-file
```

**Database Schema:**
The migration creates a `todos` table with the following structure:
- `id`: SERIAL PRIMARY KEY
- `title`: VARCHAR(255) NOT NULL
- `status`: VARCHAR(20) DEFAULT 'not yet' (CHECK constraint: 'done' or 'not yet')
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Indexes on `status` and `created_at` for better query performance

### Running the Server
```bash
node index.js  # Or npm start
```

### Testing
```bash
curl http://localhost:3000/life \
  -H "codeskytz-api-key: your-api-key-here"

curl http://localhost:3000/todos \
  -H "codeskytz-api-key: your-api-key-here"
```

### Docker Deployment (Optional)
Use this Dockerfile for containerization:
```dockerfile
FROM node:20-alpine
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 3000
CMD ["node", "index.js"]
```

---


## License

MIT License. Copyright © 2025 CodeSkyTZ. All rights reserved.

For questions, contact: shadows@codeskytz.site

---

## 🪝 Fastlipa Webhook Integration

### Webhook Setup in Fastlipa Dashboard

1. **Login to Fastlipa Dashboard**
   - Go to your Fastlipa account dashboard
   - Navigate to "Webhooks" or "API Settings"

2. **Configure Webhook URL**
   ```
   Production: https://api.codeskytz.site/api/payments/webhook
   Development: http://localhost:3000/api/payments/webhook
   ```

3. **Webhook Events to Subscribe**
   - ✅ Payment Status Updates
   - ✅ Transaction Completed
   - ✅ Transaction Failed
   - ✅ Transaction Cancelled

### Webhook Payload Examples

#### Successful Payment
```json
{
  "tranid": "pay_abc123def456",
  "status": "success",
  "amount": 1000,
  "number": "712345678",
  "timestamp": "2025-10-15T10:30:00Z"
}
```

#### Failed Payment
```json
{
  "tranid": "pay_xyz789ghi012",
  "status": "failed",
  "amount": 1000,
  "number": "712345678",
  "reason": "Insufficient balance",
  "timestamp": "2025-10-15T10:35:00Z"
}
```

### Testing Webhook Integration

#### 1. Generate Payment Link
```bash
curl -X POST http://localhost:3000/api/payments/generate-link \
  -H "codeskytz-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "description": "Test payment"}'
```

#### 2. Process Payment
```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "paymentLinkId": "generated-link-id",
    "phoneNumber": "0712345678",
    "customerName": "Test User"
  }'
```

#### 3. Test Webhook (Manual)
```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tranid": "pay_test123",
    "status": "success",
    "amount": 1000,
    "number": "712345678"
  }'
```

#### 4. Check Webhook Logs
```bash
curl http://localhost:3000/api/payments/webhook-logs \
  -H "codeskytz-api-key: your-api-key"
```

### Webhook Response Handling

The webhook endpoint will:
- ✅ **Log all incoming data** for debugging
- ✅ **Find matching payments** by transaction ID or phone number
- ✅ **Update payment status** in database
- ✅ **Store webhook data** for audit trail
- ✅ **Return appropriate HTTP status** codes

### Status Mapping

| Fastlipa Status | Our Internal Status | Description |
|-----------------|-------------------|-------------|
| `success` | `completed` | Payment successful |
| `failed` | `failed` | Payment failed |
| `cancelled` | `cancelled` | Payment cancelled |
| `pending` | `processing` | Payment in progress |

### Debugging Webhook Issues

#### Check Recent Webhook Logs
```bash
curl "http://localhost:3000/api/payments/webhook-logs?limit=10&status=error" \
  -H "codeskytz-api-key: your-api-key"
```

#### Check Logs for Specific Payment
```bash
curl http://localhost:3000/api/payments/webhook/123 \
  -H "codeskytz-api-key: your-api-key"
```

#### Manual Status Check
```bash
curl http://localhost:3000/api/payments/check-status/pay_abc123 \
  -H "codeskytz-api-key: your-api-key"
```

### Webhook Security

- ✅ **No authentication required** (Fastlipa handles security)
- ✅ **Comprehensive logging** for audit trails
- ✅ **Input validation** and sanitization
- ✅ **Error handling** with proper HTTP status codes

### Troubleshooting

#### Common Issues

1. **Webhook not received**
   - Check Fastlipa dashboard webhook URL configuration
   - Verify server is accessible from Fastlipa's IP ranges
   - Check server logs for connection errors

2. **Payment not found**
   - Webhook received before payment record created
   - Transaction ID mismatch
   - Phone number format issues

3. **Status not updating**
   - Check webhook logs for errors
   - Verify database connection
   - Check payment record exists

#### Debug Commands

```bash
# Check server logs for webhook activity
tail -f server.log | grep -i webhook

# Test webhook endpoint availability
curl -I http://localhost:3000/api/payments/webhook

# View recent webhook attempts
curl "http://localhost:3000/api/payments/webhook-logs?limit=20" \
  -H "codeskytz-api-key: your-api-key"
```

---
