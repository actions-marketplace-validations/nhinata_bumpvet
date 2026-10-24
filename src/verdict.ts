import type { Signal, Verdict } from './types.js';

/**
 * The verdict table from DESIGN.md:
 *
 *   tamper signal                                -> block
 *   content change with an origin or timing one  -> block
 *   origin anomaly or content change             -> review
 *   nothing, or only timing                      -> ok
 *
 * Timing alone does not count: almost every update is fresh when a bot opens
 * the pull request (see eval/README.md).
 */
export function decide(signals: Signal[]): Verdict {
  const has = (group: Signal['group']) => signals.some((s) => s.group === group);
  if (has('tamper')) return 'block';
  if (has('content') && (has('origin') || has('timing'))) return 'block';
  if (has('origin') || has('content')) return 'review';
  return 'ok';
}
