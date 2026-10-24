import { describe, expect, it } from 'vitest';
import { diffLockfiles, parseLockfile } from '../src/lockfile.js';
import { lockfile } from './helpers.js';

describe('diffLockfiles', () => {
  it('reports upgraded and added packages, not unchanged ones', () => {
    const before = lockfile({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '2.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.1.0' }, 'node_modules/b': { version: '2.0.0' }, 'node_modules/c': { version: '3.0.0' } });
    expect(diffLockfiles(before, after).changes).toEqual([
      { name: 'a', from: '1.0.0', to: '1.1.0', integrity: undefined },
      { name: 'c', from: null, to: '3.0.0', integrity: undefined },
    ]);
  });

  it('ignores a version that only moved to another path', () => {
    const before = lockfile({ 'node_modules/x/node_modules/a': { version: '1.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.0.0' } });
    expect(diffLockfiles(before, after).changes).toEqual([]);
  });

  it('compares a package that moved path with the version installed elsewhere', () => {
    const before = lockfile({ 'node_modules/x/node_modules/a': { version: '1.0.0' } });
    const after = lockfile({ 'node_modules/a': { version: '1.1.0' } });
    expect(diffLockfiles(before, after).changes[0]).toMatchObject({ name: 'a', from: '1.0.0', to: '1.1.0' });
  });

  it('lists the same new version once even if it is installed at several paths', () => {
    const after = lockfile({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b/node_modules/a': { version: '1.0.0' } });
    expect(diffLockfiles(null, after).changes).toHaveLength(1);
  });

  it('reads scoped names from the path', () => {
    const after = lockfile({ 'node_modules/@ctrl/tinycolor': { version: '4.1.1' } });
    expect(diffLockfiles(null, after).changes[0]?.name).toBe('@ctrl/tinycolor');
  });

  it('lists changed packages from outside the public registry as unvetted', () => {
    const after = lockfile({
      'node_modules/from-git': { version: '1.0.0', resolved: 'git+ssh://git@github.com/x/y.git#abc' },
      'node_modules/ok': { version: '1.0.0' },
    });
    const diff = diffLockfiles(null, after);
    expect(diff.changes.map((c) => c.name)).toEqual(['ok']);
    expect(diff.unvetted).toEqual([{ name: 'from-git', version: '1.0.0', source: 'git+ssh://git@github.com/x/y.git#abc' }]);
  });
});

describe('parseLockfile', () => {
  it('skips workspace links and workspace folders', () => {
    const text = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { name: 'app' },
        'packages/lib': { name: 'lib', version: '1.0.0' },
        'node_modules/lib': { resolved: 'packages/lib', link: true },
      },
    });
    expect(parseLockfile(text).size).toBe(0);
  });

  it('treats a package without `resolved` but with an integrity as from the registry', () => {
    const text = JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/a': { version: '1.0.0', integrity: 'sha512-x' } } });
    expect(parseLockfile(text).get('node_modules/a')?.elsewhere).toBeUndefined();
  });

  it('rejects lockfileVersion 1', () => {
    expect(() => parseLockfile(JSON.stringify({ lockfileVersion: 1, dependencies: {} }))).toThrow(/lockfileVersion 2 or 3/);
  });
});
