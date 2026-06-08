# API Testing Guide (Postman)

## Setup

1. Import the collection below into Postman
2. Set environment variable `base_url` to `http://localhost:3000`

---

## Endpoints

### 1. Health Check

| Method | Endpoint |
|--------|----------|
| GET | `{{base_url}}/api/health` |

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### 2. Signup (Send OTP)

Generates a 6-digit OTP, stores email/password/name/phone in memory, and sends the OTP via email. User is **not** created in Supabase yet.

| Method | Endpoint |
|--------|----------|
| POST | `{{base_url}}/api/auth/signup` |

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "message": "OTP sent to email"
}
```

**Error Response (400):**
```json
{
  "error": "Email and password are required"
}
```

---

### 3. Verify OTP & Create Account

Validates the OTP from memory, then creates the user in Supabase with the previously provided password and metadata.

| Method | Endpoint |
|--------|----------|
| POST | `{{base_url}}/api/auth/verify` |

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "token": "123456"
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": { ... }
}
```

**Error Responses (400):**
```json
{
  "error": "OTP expired or not found. Request a new one."
}
```
```json
{
  "error": "Invalid OTP"
}
```

---

### 4. Resend OTP

Generates a new 6-digit OTP (invalidates previous one) and emails it. Keeps the stored password/name/phone intact.

| Method | Endpoint |
|--------|----------|
| POST | `{{base_url}}/api/auth/resend` |

**Body (raw JSON):**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "OTP resent to email"
}
```

**Error Response (400):**
```json
{
  "error": "No OTP request found. Please sign up first."
}
```

---

### 5. Login

Authenticates the user with email + password directly via Supabase. Returns a session token. No OTP needed.

| Method | Endpoint |
|--------|----------|
| POST | `{{base_url}}/api/auth/login` |

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    ...
  },
  "user": { ... }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid login credentials"
}
```

---

## Postman Collection (Importable)

Save as `auth-api.postman_collection.json` and import into Postman:

```json
{
  "info": {
    "name": "Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/health"
      }
    },
    {
      "name": "Signup",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"securePassword123\",\n  \"name\": \"John Doe\",\n  \"phone\": \"+1234567890\"\n}"
        },
        "url": "{{base_url}}/api/auth/signup"
      }
    },
    {
      "name": "Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"token\": \"123456\"\n}"
        },
        "url": "{{base_url}}/api/auth/verify"
      }
    },
    {
      "name": "Resend OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\"\n}"
        },
        "url": "{{base_url}}/api/auth/resend"
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"securePassword123\"\n}"
        },
        "url": "{{base_url}}/api/auth/login"
      }
    }
  ]
}
```

---

## Workflow

1. **Signup** → provides email, password, name, phone → receives 6-digit OTP via email
2. **Verify OTP** → OTP validated → user created in Supabase with the password
3. If OTP expires, **Resend OTP** to get a new code
4. **Login** → email + password → returns session token for authenticated requests

## Environment Variables

| Variable | Initial Value |
|----------|--------------|
| `base_url` | `http://localhost:3000` |

## Notes

- OTP is **6-digit numeric**, stored in-memory (lost on server restart)
- Default expiry: **5 minutes** (configurable via `OTP_EXPIRY` in `.env`, in seconds)
- User is created in Supabase **only after** OTP verification
- Role is set to `NORMAL_USER` via `user_metadata`
