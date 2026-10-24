import type { Change, Unvetted } from './types.js';

const REGISTRY = 'https://registry.npmjs.org/';

interface LockEntry {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  inBundle?: boolean;
}

export interface LockPackage {
  name: string;
  version: string;
  integrity?: string;
  /** Where the package comes from when that is not the public registry (git, file:, another registry). */
  elsewhere?: string;
}

/**
 * Reads the installed packages of a package-lock.json (lockfileVersion 2 or 3).
 * Workspace links and bundled dependencies are left out: they are not
 * downloaded on their own.
 */
export function parseLockfile(text: string): Map<string, LockPackage> {
  const lock = JSON.parse(text) as { lockfileVersion?: number; packages?: Record<string, LockEntry> };
  if (!lock.packages || (lock.lockfileVersion ?? 0) < 2) {
    throw new Error('only package-lock.json with lockfileVersion 2 or 3 is supported');
  }
  const out = new Map<string, LockPackage>();
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path.includes('node_modules/') || entry.link || entry.inBundle || !entry.version) continue;
    const name = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    // npm leaves `resolved` out for registry packages with omit-lockfile-registry-resolved.
    const fromRegistry = entry.resolved ? entry.resolved.startsWith(REGISTRY) : !!entry.integrity;
    out.set(path, { name, version: entry.version, integrity: entry.integrity, elsewhere: fromRegistry ? undefined : (entry.resolved ?? 'unknown source') });
  }
  return out;
}

export interface LockfileDiff {
  changes: Change[];
  /** Changed packages that do not come from the public registry, so bumpvet cannot vet them. */
  unvetted: Unvetted[];
}

/**
 * Package versions the new lockfile installs that the old one did not install
 * anywhere. A version that only moved to another path was already trusted.
 */
export function diffLockfiles(oldText: string | null, newText: string): LockfileDiff {
  const before = oldText === null ? new Map<string, LockPackage>() : parseLockfile(oldText);
  const after = parseLockfile(newText);
  const installed = new Set([...before.values()].map((p) => `${p.name}@${p.version}`));
  const anyVersion = new Map([...before.values()].map((p) => [p.name, p.version]));
  const seen = new Set<string>();
  const changes: Change[] = [];
  const unvetted: Unvetted[] = [];
  for (const [path, pkg] of after) {
    if (installed.has(`${pkg.name}@${pkg.version}`)) continue;
    const prev = before.get(path);
    const from = prev && prev.name === pkg.name ? prev.version : (anyVersion.get(pkg.name) ?? null);
    const key = `${pkg.name}@${from}>${pkg.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pkg.elsewhere) unvetted.push({ name: pkg.name, version: pkg.version, source: pkg.elsewhere });
    else changes.push({ name: pkg.name, from, to: pkg.version, integrity: pkg.integrity });
  }
  changes.sort((a, b) => a.name.localeCompare(b.name) || a.to.localeCompare(b.to));
  unvetted.sort((a, b) => a.name.localeCompare(b.name));
  return { changes, unvetted };
}
