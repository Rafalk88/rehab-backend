export const permCache = new Map<string, { perms: string[]; expiresAt: number }>();

const TTL_MS = 60_000;

/* Pobiera uprawnienia z pamięci podręcznej */
export function cacheGet(userId: string) {
  const entry = permCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    permCache.delete(userId);
    return null;
  }
  return entry.perms;
}

/* Zapisuje uprawnienia do pamięci podręcznej */
export function cacheSet(userId: string, perms: string[]) {
  permCache.set(userId, { perms, expiresAt: Date.now() + TTL_MS });
}
