/** One package version that the lockfile change brings in. */
export interface Change {
  name: string;
  /** Version the old lockfile had, or null when the package is new. */
  from: string | null;
  to: string;
  /** Integrity the new lockfile expects, if it records one. */
  integrity?: string;
}

export type SignalId = 'publisher-changed' | 'provenance-lost' | 'fresh-publish' | 'install-scripts' | 'integrity-mismatch' | 'not-in-registry';

/** Which side of the verdict table a signal belongs to (see DESIGN.md). */
export type SignalGroup = 'origin' | 'timing' | 'content' | 'tamper';

/**
 * Every signal has the same shape: what the recent versions looked like
 * (`before`) and what the new version looks like (`after`).
 */
export interface Signal {
  id: SignalId;
  group: SignalGroup;
  before: string;
  after: string;
}

export type Verdict = 'ok' | 'review' | 'block';

export interface PackageResult {
  name: string;
  from: string | null;
  to: string;
  verdict: Verdict;
  signals: Signal[];
}

/** The subset of an npm packument that bumpvet reads. */
export interface Packument {
  name: string;
  time: Record<string, string>;
  versions: Record<string, VersionManifest>;
}

export interface VersionManifest {
  version: string;
  _npmUser?: { name?: string };
  scripts?: Record<string, string>;
  dist?: { integrity?: string; attestations?: unknown };
}
