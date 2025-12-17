import Joi from 'joi';

/**
 * Schema for contact submissions.
 */
export const contactSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  message: Joi.string().min(1).max(5000).required(),
});

/**
 * PUBLIC_INTERFACE
 * sanitizeInput(obj)
 * Returns a safely trimmed copy of allowed fields to prevent header injection or log pollution.
 */
export function sanitizeInput(obj) {
  const clean = {};
  clean.name = trimSafe(obj.name);
  clean.email = trimSafe(obj.email);
  clean.message = String(obj.message ?? '').replace(/\r/g, '').trim();
  return clean;
}

function trimSafe(v) {
  return String(v ?? '').replace(/[\r\n]/g, ' ').trim();
}
