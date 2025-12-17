import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Simple IP-based rate limiting middleware.
 */
const points = Number(process.env.RATE_LIMIT_POINTS || 5); // requests
const duration = Number(process.env.RATE_LIMIT_DURATION || 60); // per seconds

const limiter = new RateLimiterMemory({
  points,
  duration,
});

export async function rateLimiterMiddleware(req, res, next) {
  try {
    const key = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'global';
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'rate_limited' });
  }
}
