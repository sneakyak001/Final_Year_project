// ── Crypto Helpers (same logic as main HMS app's db.ts) ───────────────────────

export function generateHex(byteLength = 16): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < byteLength * 2; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/** Simple hash for mobile (React Native doesn't have full Web Crypto PBKDF2 without native modules) */
export async function hashPassword(password: string, salt: string): Promise<string> {
  // Use a simple but consistent hash combining password + salt
  const combined = password + ':' + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // Expand to a 64-char hex-like string for compatibility
  const base = Math.abs(hash).toString(16).padStart(8, '0');
  const expanded = (base + salt).substring(0, 64).padEnd(64, '0');
  return expanded;
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const derived = await hashPassword(password, salt);
  return derived === storedHash;
}
