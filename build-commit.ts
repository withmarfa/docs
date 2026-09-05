import { execSync } from 'node:child_process';

/**
 * The commit a bundle was built from, served at `/version.json` so that
 * "is this change live?" is a fetch rather than a reading of the prose.
 *
 * MARFA_BUILD_COMMIT is set by the publish workflow to the same expression it
 * checks out, so the stamp cannot disagree with what was deployed.
 * Deliberately not GITHUB_SHA: on a `workflow_run` event that is the default
 * branch head rather than the commit the triggering run passed on, so a re-run
 * of an older run would have deployed old content while stamping current main
 * and every later check would have compared equal and reported green.
 *
 * The dirty suffix is the other half. A hand-deploy from a modified tree would
 * otherwise stamp a commit whose tree does not contain the code being served,
 * which defeats the same check the same way.
 *
 * Shared by both build targets. A `define` does not carry from one Vite config
 * to another, and two copies of this would drift the moment one was fixed.
 */
export function buildCommit(): string {
  if (process.env.MARFA_BUILD_COMMIT) return process.env.MARFA_BUILD_COMMIT;
  try {
    const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    return dirty ? `${head}-dirty` : head;
  } catch {
    // No git, no answer. "unknown" never compares equal to a real commit, so
    // a checker reports a problem rather than being quietly satisfied.
    return 'unknown';
  }
}
