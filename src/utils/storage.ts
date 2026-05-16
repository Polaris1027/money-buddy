/**
 * LocalStorage 存储抽象层（带命名空间和容错）
 */
const NS = 'money_buddy_v1';

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(`${NS}:${key}`);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('storage.set failed', e);
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(`${NS}:${key}`);
    } catch {
      /* noop */
    }
  },
  clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${NS}:`))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  },
};
