/**
 * PermissionsCache
 *
 * A simple cache layer for storing user permissions in memory.
 * Prevents frequent database queries for the same user's permissions.
 */
export class PermissionsCache {
  private cache = new Map<string, { perms: string[]; expiresAt: number }>();
  private readonly TTL_MS = 60_000; // 1 minute

  /**
   * Retrieves cached permissions for a given user.
   * @param userId - The ID of the user.
   * @returns List of permissions or null if expired/missing.
   */
  get(userId: string): string[] | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.perms;
  }

  /**
   * Stores permissions for a user in the cache.
   * @param userId - The ID of the user.
   * @param perms - List of permissions to store.
   */
  set(userId: string, perms: string[]): void {
    this.cache.set(userId, { perms, expiresAt: Date.now() + this.TTL_MS });
  }
}
