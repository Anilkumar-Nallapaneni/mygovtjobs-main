import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Block accidental outbound HTTP in unit tests.
 * Tests that need fetch should stub it explicitly in beforeEach.
 */
const realFetch = globalThis.fetch;

beforeEach(() => {
  if (vi.isMockFunction(globalThis.fetch)) return;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return realFetch(input);
      }
      throw new Error(`Unexpected network fetch in unit test: ${url}`);
    }),
  );
});

afterEach(() => {
  if (!vi.isMockFunction(globalThis.fetch)) return;
  vi.unstubAllGlobals();
});
