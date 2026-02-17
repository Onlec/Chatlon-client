import { log } from './debug';
import { clearEncryptionCache } from './encryption';

/**
 * Clear all Chatlon caches and temporary data
 */
export function clearAllCaches() {
  log('[Cache] Starting cache cleanup...');
  
  let itemsCleared = 0;
  
  // 1. Clear encryption cache
  try {
    clearEncryptionCache();
    itemsCleared++;
    log('[Cache] Encryption cache cleared');
  } catch (e) {
    log('[Cache] Error clearing encryption cache:', e);
  }
  
  // 2. Clear Gun.js local data (optional - can be aggressive)
  try {
    // Gun stores data in IndexedDB under 'gun/' prefix
    if (window.indexedDB) {
      // Note: This is async, but we'll fire and forget
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name && db.name.startsWith('gun')) {
            indexedDB.deleteDatabase(db.name);
            log('[Cache] Deleted Gun database:', db.name);
            itemsCleared++;
          }
        });
      });
    }
  } catch (e) {
    log('[Cache] Error clearing Gun databases:', e);
  }
  
  // 3. Clear session storage (except boot flag)
  try {
    const bootFlag = sessionStorage.getItem('chatlon_boot_complete');
    sessionStorage.clear();
    if (bootFlag) {
      sessionStorage.setItem('chatlon_boot_complete', bootFlag);
    }
    itemsCleared++;
    log('[Cache] Session storage cleared');
  } catch (e) {
    log('[Cache] Error clearing session storage:', e);
  }
  
  // 4. Clear any cached blobs/URLs
  // (If you have any URL.createObjectURL calls, revoke them here)
  
  log(`[Cache] Cleanup complete. ${itemsCleared} caches cleared.`);
  
  return itemsCleared;
}