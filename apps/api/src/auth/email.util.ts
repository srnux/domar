/**
 * Email addresses are stored and compared case-insensitively: the local part is
 * technically case-sensitive per RFC 5321, but no real mail provider treats it
 * that way, and users expect "Pavle.Voda@…" and "pavle.voda@…" to be the same
 * login. Normalizing on every read/write keeps the unique constraint meaningful.
 */
export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
