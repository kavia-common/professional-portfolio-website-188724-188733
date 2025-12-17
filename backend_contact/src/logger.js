/**
 * Minimal leveled logger with JSON output to stdout.
 */
const levels = ['error', 'warn', 'info', 'http', 'debug'];
const envLevel = (process.env.LOG_LEVEL || process.env.REACT_APP_LOG_LEVEL || 'info').toLowerCase();
const levelIdx = Math.max(0, levels.indexOf(envLevel));

function logAt(idx, level, msg, meta) {
  if (idx > levelIdx) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta && typeof meta === 'object' ? meta : {})
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

// PUBLIC_INTERFACE
export const logger = {
  /** PUBLIC_INTERFACE */
  error: (msg, meta) => logAt(0, 'error', msg, meta),
  /** PUBLIC_INTERFACE */
  warn: (msg, meta) => logAt(1, 'warn', msg, meta),
  /** PUBLIC_INTERFACE */
  info: (msg, meta) => logAt(2, 'info', msg, meta),
  /** PUBLIC_INTERFACE */
  http: (msg, meta) => logAt(3, 'http', msg, meta),
  /** PUBLIC_INTERFACE */
  debug: (msg, meta) => logAt(4, 'debug', msg, meta),
};
