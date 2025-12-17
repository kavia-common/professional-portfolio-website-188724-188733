/**
 * Express server for contact form submissions.
 * Exposes:
 * - GET /health: healthcheck
 * - POST /contact: accepts { name, email, message, [honeypot] }
 * Uses Joi validation, IP-based rate limiting, simple honeypot spam check,
 * and sends email via SMTP (Nodemailer), with optional SendGrid/Resend branch.
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimiterMiddleware } from './rateLimit.js';
import { contactSchema, sanitizeInput } from './validators.js';
import { logger } from './logger.js';
import { sendContactEmail } from './email.js';

// PUBLIC_INTERFACE
function createApp() {
  /**
   * PUBLIC_INTERFACE: Creates and configures the Express app.
   * Returns an Express application instance ready to be started by a server.
   */
  const app = express();

  // Settings and environment
  const port = Number(process.env.PORT || process.env.REACT_APP_PORT || 4001);
  const trustProxy = String(process.env.TRUST_PROXY || process.env.REACT_APP_TRUST_PROXY || '1') === '1';
  const healthPath = process.env.HEALTHCHECK_PATH || process.env.REACT_APP_HEALTHCHECK_PATH || '/health';

  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // Security and common middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  // CORS configuration
  const originsRaw = process.env.CORS_ORIGINS || process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_BACKEND_URL || '';
  const allowedOrigins = originsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: function (origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.length === 0) return cb(null, true); // allow all if not configured
        const ok = allowedOrigins.includes(origin);
        cb(ok ? null : new Error('Not allowed by CORS'), ok);
      },
      methods: ['POST', 'GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: false,
      maxAge: 86400
    })
  );

  // Logging
  app.use(morgan('combined', {
    stream: {
      write: (msg) => logger.http(msg.trim())
    }
  }));

  // Healthcheck with OpenAPI-like description in comments
  /**
   * GET /health
   * Summary: Service healthcheck.
   * Returns: 200 with { status: 'ok', uptime, version } if running.
   */
  app.get(healthPath, (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });

  // Contact route
  /**
   * POST /contact
   * Summary: Submit a contact message
   * Body:
   *  - name: string (1..120)
   *  - email: string (valid email)
   *  - message: string (1..5000)
   *  - [honeypot field]: string, must be empty; default field name from HONEYPOT_FIELD (.env)
   * Responses:
   *  - 202 Accepted: { success: true, id }
   *  - 400 Bad Request: { error: 'validation_error', details: [...] }
   *  - 429 Too Many Requests: { error: 'rate_limited' }
   *  - 500 Internal Server Error: { error: 'send_failed' }
   */
  app.post('/contact', rateLimiterMiddleware, async (req, res) => {
    const honeypotField = process.env.HONEYPOT_FIELD || 'website';

    // Honeypot spam protection
    if (typeof req.body?.[honeypotField] !== 'undefined' && String(req.body[honeypotField]).trim() !== '') {
      logger.warn('Honeypot triggered; dropping submission');
      return res.status(202).json({ success: true, id: null }); // pretend success
    }

    // Validate input
    const { error, value } = contactSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'validation_error',
        details: error.details.map(d => ({ message: d.message, path: d.path }))
      });
    }

    // Sanitize values for sending/logging
    const payload = sanitizeInput(value);

    try {
      const sendResult = await sendContactEmail(payload, req);
      // Return accepted even if background delivery might happen
      return res.status(202).json({ success: true, id: sendResult?.messageId || sendResult?.id || null });
    } catch (err) {
      logger.error('Failed to send contact email', { err: err?.message });
      return res.status(500).json({ error: 'send_failed' });
    }
  });

  // Not found handler
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', { err: err?.message });
    res.status(500).json({ error: 'internal_error' });
  });

  // Start only if this file is the entrypoint
  if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(port, () => {
      logger.info(`backend_contact listening on port ${port}`);
    });
  }

  return app;
}

createApp();

export { createApp };
