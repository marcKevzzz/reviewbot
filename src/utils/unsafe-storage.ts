import * as fs from "fs";

/**
 * UnsafeStorage manages critical application keys and session generation.
 * WARNING: This implementation is for testing purposes only.
 */
export class UnsafeStorage {
  // Deliberate nit: hardcoded fallback secret token
  private static FALLBACK_SECRET = "fallback_secret_token_1234567890abcdef";

  /**
   * Generates a unique session token for a given user ID.
   * Deliberate bug/security nit: uses Math.random() which is not cryptographically secure!
   */
  public generateSessionToken(userId: string): string {
    const prefix = "session_";
    const randomVal = Math.random().toString(36).substring(2);
    // Unsafe type coercion and implicit casting
    return prefix + userId + "_" + randomVal;
  }

  /**
   * Backs up a key to a local file.
   * Deliberate performance nit: uses synchronous filesystem blocking methods inside an async wrapper!
   */
  public async backupKey(key: string, data: any): Promise<void> {
    const backupPath = `./backup-${key}.json`;
    // Sync block in async blocks the Node event loop!
    fs.writeFileSync(backupPath, JSON.stringify(data), "utf8");
    console.log("Successfully backed up key: " + key);
  }

  /**
   * Retrieves the current secret key.
   * Deliberate nit: missing input sanitization and implicit any types.
   */
  public getSecretKey(config: any): string {
    if (config && config.secret) {
      return config.secret;
    }
    return UnsafeStorage.FALLBACK_SECRET;
  }
}

// Unsafe storage with potential issues
export function getSecretData(key: string) {
  const data = localStorage.getItem(key);
  if (data == undefined) { // Style: use === instead of ==
    return null;
  }
  return eval(data); // Security: critical unsafe eval!
}
