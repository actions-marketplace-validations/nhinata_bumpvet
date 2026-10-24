import { describe, expect, it } from 'vitest';
import { diffLockfiles, parseLockfile } from '../src/lockfile.js';
import { lockfile } from './helpers.js';

describe('diffLockfiles', () => {
  it('reports upgraded and added packages, not unchanged ones', () => {
    const before = lockfile({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '2.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.1.0' }, 'node_modules/b': { version: '2.0.0' }, 'node_modules/c': { version: '3.0.0' } });
    expect(diffLockfiles(before, after)).toEqual([
      { name: 'a', from: '1.0.0', to: '1.1.0', integrity: undefined },
      { name: 'c', from: null, to: '3.0.0', integrity: undefined },
    ]);
  });

  it('ignores a version that only moved to another path', () => {
    const before = lockfile({ 'node_modules/x/node_modules/a': { version: '1.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.0.0' } });
    expect(diffLockfiles(before, after)).toEqual([]);
  });

  it('compares a package that moved path with the version installed elsewhere', () => {
    const before = lockfile({ 'node_modules/x/node_modules/a': { version: '1.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.1.0' } });
    expect(diffLockfiles(before, after)[0]).toMatchObject({ name: 'a', from: '1.0.0', to: '1.1.0' });
  });

  it('lists the same new version once even if it is installed at several paths', () => {
    const after = lockfile({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b/node_modules/a': { version: '1.0.0' } });
    expect(diffLockfiles(null, after)).toHaveLength(1);
  });

  it('reads scoped names from the path', () => {
    const after = lockfile({ 'node_modules/@ctrl/tinycolor': { version: '4.1.1' } });
    expect(diffLockfiles(null, after)[0]?.name).toBe('@ctrl/tinycolor');
  });
});

describe('parseLockfile', () => {
  it('skips workspaces and packages not from the public registry', () => {
    const text = lockfile({
      'node_modules/ws-pkg': { version: '1.0.0', link: true },
      'node_modules/from-git': { version: '1.0.0', resolved: 'git+ssh://git@github.com/x/y.git#abc' },
      'node_modules/ok': { version: '1.0.0' },
    });
    expect([...parseLockfile(text).values()].map((p) => p.name)).toEqual(['ok']);
  });

  it('rejects lockfileVersion 1', () => {
    expect(() => parseLockfile(JSON.stringify({ lockfileVersion: 1, dependencies: {} }))).toThrow(/lockfileVersion 2 or 3/);
  });
});
