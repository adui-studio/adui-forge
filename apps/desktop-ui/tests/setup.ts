/** Node 测试环境的最小 localStorage 桩（settings 依赖它持久化）。 */
const store = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
  clear: (): void => {
    store.clear();
  },
  key: (index: number): string | null => [...store.keys()][index] ?? null,
  get length(): number {
    return store.size;
  },
} as Storage;
