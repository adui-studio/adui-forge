export const createId = (prefix: string): string => {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
};
