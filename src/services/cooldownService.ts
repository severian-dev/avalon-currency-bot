const cooldowns = new Map<string, number>();

export function checkAndStamp(key: string, seconds: number): number | null {
  const now = Date.now();
  const expiresAt = cooldowns.get(key);
  if (expiresAt && expiresAt > now) {
    return Math.ceil((expiresAt - now) / 1000);
  }
  cooldowns.set(key, now + seconds * 1000);
  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of cooldowns) {
    if (exp <= now) cooldowns.delete(k);
  }
}, 60_000).unref();
