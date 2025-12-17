# backend_contact

Express backend for handling contact form submissions with validation, spam/rate protection, and email delivery.

## Features
- POST /contact with Joi validation
- Honeypot spam protection (honeypot field configurable)
- IP-based rate limiting
- CORS with allowed origins list
- Email sending via:
  - SMTP (Nodemailer) by default
  - Optional SendGrid (set SENDGRID_API_KEY)
  - Optional Resend (set RESEND_API_KEY if SendGrid not set)
- Healthcheck endpoint
- Structured logging (JSON)
- Dockerfile and .dockerignore
- .env.example with all necessary variables

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Configure environment
- Copy `.env.example` to `.env` and set values:
  - For local dev: ensure `PORT=4001`, `CORS_ORIGINS=http://localhost:3000`.
  - For SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_TO`.
  - Optional SendGrid: set `SENDGRID_API_KEY`, `SENDGRID_TO`.
  - Optional Resend: set `RESEND_API_KEY`, `RESEND_TO`.

3) Run the server
```bash
npm run dev
```
Server will listen on `http://localhost:4001`.

## API

### GET /health
Simple healthcheck.
- 200: `{ status: "ok", uptime, version }`

### POST /contact
Submit a contact message.
- Body (JSON):
  - name: string (1..120)
  - email: string (valid email)
  - message: string (1..5000)
  - [honeypot field]: default `website` (see `HONEYPOT_FIELD`); must be empty
- Responses:
  - 202: `{ success: true, id }`
  - 400: `{ error: "validation_error", details: [...] }`
  - 429: `{ error: "rate_limited" }`
  - 500: `{ error: "send_failed" }`

Example:
```bash
curl -X POST http://localhost:4001/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","message":"Hello!"}'
```

## Environment

See `.env.example` for all variables. Key ones:
- PORT: server port (default 4001)
- CORS_ORIGINS: comma-separated list, e.g. http://localhost:3000
- RATE_LIMIT_POINTS / RATE_LIMIT_DURATION: simple IP rate limiting
- HONEYPOT_FIELD: name of fake field bots fill (default "website")

Email:
- SMTP_* for Nodemailer SMTP
- SENDGRID_API_KEY to use SendGrid
- RESEND_API_KEY to use Resend (if SendGrid not set)

## Docker

Build:
```bash
docker build -t backend_contact:latest .
```

Run:
```bash
docker run --rm -p 4001:4001 --env-file .env backend_contact:latest
```

## Notes

- If no email provider variables are set, the service simulates success and returns 202 without sending.
- Set `TRUST_PROXY=1` when running behind a reverse proxy to ensure correct IP detection for rate limiting.
