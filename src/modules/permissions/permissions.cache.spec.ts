import { jest } from '@jest/globals';
import { PermissionsCache } from './permissions.cache.js';

describe('PermissionsCache', () => {
  let cache: PermissionsCache;

  beforeEach(() => {
    cache = new PermissionsCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve permissions', () => {
    cache.set('user-1', ['PERM_READ']);
    expect(cache.get('user-1')).toEqual(['PERM_READ']);
  });

  it('should return null if no entry', () => {
    expect(cache.get('user-1')).toBeNull();
  });

  it('should expire cached permissions after TTL', () => {
    cache.set('user-1', ['PERM_READ']);
    jest.advanceTimersByTime(60_001);
    expect(cache.get('user-1')).toBeNull();
  });

  it('should refresh entry on set', () => {
    cache.set('user-1', ['PERM_READ']);
    jest.advanceTimersByTime(30_000);
    cache.set('user-1', ['PERM_WRITE']);
    jest.advanceTimersByTime(35_000);
    expect(cache.get('user-1')).toEqual(['PERM_WRITE']);
  });
});
