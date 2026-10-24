import type { Verdict } from './types.js';
import type { VetReport } from './vet.js';

const ORDER: Verdict[] = ['block', 'review', 'ok'];
const LABEL: Record<Verdict, string> = { block: 'BLOCK ', review: 'REVIEW', ok: 'OK    ' };

export function formatText({ results, unvetted }: VetReport): string {
  if (results.length === 0 && unvetted.length === 0) return 'No dependency versions changed.\n';
  const lines: string[] = [];
  for (const verdict of ORDER) {
    const group = results.filter((r) => r.verdict === verdict);
    if (verdict === 'ok') {
      if (group.length) lines.push(`${LABEL.ok}  ${group.length} package${group.length === 1 ? '' : 's'} with no signals`);
      continue;
    }
    for (const r of group) {
      lines.push(`${LABEL[verdict]}  ${r.name} ${r.from ?? '(new)'} -> ${r.to}`);
      const width = Math.max(...r.signals.map((s) => s.id.length));
      for (const s of r.signals) lines.push(`        ${s.id.padEnd(width)}  ${s.before} -> ${s.after}`);
    }
  }
  if (unvetted.length) {
    lines.push(`Not vetted (not from the public npm registry): ${unvetted.length}`);
    for (const u of unvetted) lines.push(`        ${u.name}@${u.version}  ${u.source}`);
  }
  return lines.join('\n') + '\n';
}

export function formatJson({ results, unvetted }: VetReport): string {
  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  const summary = { block: count('block'), review: count('review'), ok: count('ok'), unvetted: unvetted.length };
  return JSON.stringify({ summary, packages: results, unvetted }, null, 2) + '\n';
}
