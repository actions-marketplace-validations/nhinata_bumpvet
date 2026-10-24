export { diffLockfiles, parseLockfile, type LockfileDiff } from './lockfile.js';
export { registryFetcher, type FetchPackument } from './registry.js';
export { computeSignals, type SignalOptions } from './signals.js';
export { decide } from './verdict.js';
export { vetChanges, vetLockfiles, type VetReport } from './vet.js';
export { formatJson, formatText } from './report.js';
export type * from './types.js';
