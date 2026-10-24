import type { Packument } from './types.js';

export type FetchPackument = (name: string) => Promise<Packument | null>;

/** Fetches full packuments from the public registry. Returns null for a package the registry does not have. */
export function registryFetcher(base = 'https://registry.npmjs.org/', fetchImpl: typeof fetch = fetch): FetchPackument {
  const cache = new Map<string, Promise<Packument | null>>();
  return (name) => {
    let p = cache.get(name);
    if (!p) {
      p = (async () => {
        const res = await fetchImpl(base + name.replace('/', '%2f'), { headers: { accept: 'application/json' } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`registry returned ${res.status} for ${name}`);
        return (await res.json()) as Packument;
      })();
      cache.set(name, p);
    }
    return p;
  };
}
