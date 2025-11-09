---

# CodeSkyTZ unrelational API


A powerful RESTful API providing beautifully crafted, AI-generated motivational quotes about life, coding, and success (powered by Gemini 2.0 Flash), comprehensive todo management, secure payment link generation with Fastlipa mobile money integration, and complete webhook handling - all backed by PostgreSQL with comprehensive documentation.

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

### 1. POST /api/payments/generate-link
Generates a unique payment link with Fastlipa integration. The generated link can be shared with customers for secure payment processing.

#### Request
```bash
curl -X POST https://api.codeskytz.site/api/payments/generate-link \
  -H "Content-Type: application/json" \
  -H "codeskytz-api-key: your-api-key-here" \
  -d '{
    "amount": 1000,
    "description": "Payment for services",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "returnUrl": "https://example.com"
  }'
```

#### Parameters
- `amount` (required): Payment amount in TZS (minimum 0.01)
- `description` (required): Payment description (3-255 characters)
- `customerName` (optional): Customer's full name (2-255 characters)
- `customerEmail` (optional): Customer's email address (valid email, max 255 characters)
- `returnUrl` (optional): URL to redirect after successful payment (valid URI, max 500 characters)

#### Response (201 Created)
```json
{
  "success": true,
  "paymentLink": "https://api.codeskytz.site/pay/abc-123-def-456",
  "paymentLinkId": "abc-123-def-456",
  "payment": {
    "id": 123,
    "payment_link_id": "abc-123-def-456",
    "amount": 1000,
    "currency": "TZS",
    "description": "Payment for services",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "return_url": "https://example.com",
    "status": "pending",
    "created_at": "2025-11-09T22:30:00.000Z"
  }
}
```

#### Error Examples
```json
// Validation Error (400 Bad Request)
{
  "error": "Validation failed",
  "code": "VALIDATION_FAIL",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}

// Authentication Error (401 Unauthorized)
{
  "error": "API key required",
  "code": "AUTH_REQUIRED"
}
```

### 2. GET /api/payments/link/{paymentLinkId}
Retrieves payment details for a specific payment link ID.

#### Request
```bash
curl -X GET https://api.codeskytz.site/api/payments/link/abc-123-def-456 \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Response (200 OK)
```json
{
  "success": true,
  "payment": {
    "id": 123,
    "payment_link_id": "abc-123-def-456",
    "amount": 1000,
    "description": "Payment for services",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "return_url": "https://example.com",
    "status": "pending",
    "created_at": "2025-11-09T22:30:00.000Z"
  }
}
```

### 3. POST /api/payments/process
Processes a payment using Fastlipa gateway for a specific payment link.

#### Request
```bash
curl -X POST https://api.codeskytz.site/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "paymentLinkId": "abc-123-def-456",
    "phoneNumber": "0712345678",
    "customerName": "John Doe"
  }'
```

#### Response (200 OK)
```json
{
  "success": true,
  "paymentId": "fastlipa_payment_123",
  "status": "processing",
  "instructions": "Payment initiated successfully. Please check your phone."
}
```

### 4. GET /api/payments/stats
Retrieves payment statistics and analytics.

#### Request
```bash
curl -X GET https://api.codeskytz.site/api/payments/stats \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Response (200 OK)
```json
{
  "total_payments": 150,
  "total_amount": 250000.00,
  "completed_payments": 140,
  "pending_payments": 8,
  "failed_payments": 2
}
```

### 5. GET /life
Retrieves a beautifully crafted, AI-generated motivational quote about life, coding, and success.

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
  "author": "CodeSkyTZ"
}
```

#### Error Example (500 Internal Server Error)
```json
{
  "error": "Neural net glitched—try again.",
  "code": "AI_DOWN"
}
```

### 6. GET /todos
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

### 7. POST /todos
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

### 8. PATCH /todos/:id
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

### 9. DELETE /todos/:id
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

- **Node.js + Express.js**: Backend framework with RESTful API design
- **Gemini 2.0 Flash API**: AI-powered motivational quote generation
- **PostgreSQL (Kinsta Cloud)**: Robust database with migrations
- **Fastlipa Payment Gateway**: Mobile money payment processing
- **dotenv**: Environment variable management
- **Joi**: Comprehensive request validation middleware
- **Swagger/OpenAPI**: Interactive API documentation
- **UUID**: Secure payment link generation
- **Axios**: HTTP client for external API integrations

Includes comprehensive error handling, authentication middleware, and detailed logging.

---

## Local Development Setup

### Prerequisites
- Node.js v20 or higher
- PostgreSQL (local instance or Kinsta Cloud)
- Git

### Installation
```bash
git clone https://github.com/codeskytz/non-relational-api.git
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

**Payments Table:**
- `id`: SERIAL PRIMARY KEY
- `payment_link_id`: VARCHAR(255) UNIQUE NOT NULL (UUID-based)
- `amount`: DECIMAL(10,2) NOT NULL
- `currency`: VARCHAR(3) DEFAULT 'TZS'
- `phone_number`: VARCHAR(20)
- `customer_name`: VARCHAR(255)
- `customer_email`: VARCHAR(255)
- `description`: TEXT
- `return_url`: VARCHAR(500) (NEW: Custom return URL after payment)
- `status`: VARCHAR(50) DEFAULT 'pending' (CHECK: pending/processing/completed/failed/cancelled)
- `payment_reference`: VARCHAR(255)
- `external_payment_id`: VARCHAR(255)
- `payment_method`: VARCHAR(100)
- `fastlipa_response`: JSONB
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `paid_at`: TIMESTAMP

**Todos Table:**
- `id`: SERIAL PRIMARY KEY
- `title`: VARCHAR(255) NOT NULL
- `status`: VARCHAR(20) DEFAULT 'not yet' (CHECK constraint: 'done' or 'not yet')
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Webhook Logs Table:**
- `id`: SERIAL PRIMARY KEY
- `payment_id`: INTEGER REFERENCES payments(id)
- `webhook_data`: JSONB NOT NULL
- `status`: VARCHAR(50) NOT NULL
- `error_message`: TEXT
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Indexes optimized for performance on frequently queried columns.

### Running the Server
```bash
node index.js  # Or npm start
```
### Testing
```bash
# Test AI quote generation
curl http://localhost:3000/life \
  -H "codeskytz-api-key: your-api-key-here"

# Test payment link generation with return URL
curl -X POST http://localhost:3000/api/payments/generate-link \
  -H "Content-Type: application/json" \
  -H "codeskytz-api-key: your-api-key-here" \
  -d '{
    "amount": 1000,
    "description": "Test payment",
    "returnUrl": "https://example.com/success"
  }'

# Test todo management
curl http://localhost:3000/todos \
  -H "codeskytz-api-key: your-api-key-here"
```

#### Example Responses

**Quote Generation:**
```json
{
  "quote": "Every sunrise resets your code—rewrite your destiny clean and fresh.",
  "mood": "inspirational",
  "author": "CodeSkyTZ"
}
```

**Payment Link Generation:**
```json
{
  "success": true,
  "paymentLink": "http://localhost:3000/pay/abc-123-def-456",
  "paymentLinkId": "abc-123-def-456",
  "payment": {
    "id": 123,
    "amount": 1000,
    "description": "Test payment",
    "return_url": "https://example.com/success",
    "status": "pending"
  }
}
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

## 💳 Payment Integration Features

### ✨ New: Custom Return URLs
The payment link generation now supports an optional `returnUrl` parameter that allows you to specify where users should be redirected after successful payment completion. This enables seamless integration with external applications and custom success pages.

**Example:**
```bash
curl -X POST https://api.codeskytz.site/api/payments/generate-link \
  -H "Content-Type: application/json" \
  -H "codeskytz-api-key: your-api-key-here" \
  -d '{
    "amount": 1000,
    "description": "Premium service subscription",
    "returnUrl": "https://myapp.com/payment/success"
  }'
```

The generated payment form will display a "Back to Home" button that uses your custom URL instead of defaulting to the API homepage.

### 🔗 Payment Link Generation
- ✅ **Secure UUID-based links** with expiration handling
- ✅ **Custom return URLs** for seamless user experience
- ✅ **Comprehensive validation** for all input parameters
- ✅ **Database persistence** with full audit trail
- ✅ **Real-time status tracking** and updates

### 📱 Payment Processing
- ✅ **Fastlipa integration** for mobile money payments
- ✅ **Multi-currency support** (TZS default)
- ✅ **Phone number validation** and formatting
- ✅ **Real-time payment status** updates
- ✅ **Webhook handling** with comprehensive logging

### 📊 Analytics & Monitoring
- ✅ **Payment statistics** dashboard
- ✅ **Webhook logs** for debugging and audit
- ✅ **Status tracking** across all payment states
- ✅ **Performance metrics** and analytics

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
