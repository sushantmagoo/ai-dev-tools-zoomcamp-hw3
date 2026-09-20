# Release process

How a change actually ships, day to day. For how the pipeline is built and
why, see [`deployment.md`](deployment.md).

## The short version

There's one branch that matters: `master`. Every push to it that passes
all tests deploys automatically. There's no separate release branch, no
version tags, no staging environment — this is a small, single-instance
practice project, and that level of process would be overhead without a
matching benefit. If the project grows real users, this is the first
place to add more ceremony (a staging environment before production is
the natural next step).

## What runs when

| Trigger | Jobs that run |
| --- | --- |
| Pull request targeting `master` | `backend-tests`, `frontend-tests`, `integration-and-e2e` — **not** `deploy` |
| Push to `master` (i.e. a merge) | All four jobs, ending in `deploy` |
| Manual (`Actions` tab → *CI/CD* → *Run workflow*, on `master`) | All four jobs, including `deploy` — use this to redeploy without a new commit (e.g. after fixing infrastructure by hand) |

`backend-tests` and `frontend-tests` run in parallel (no dependency
between them); `integration-and-e2e` waits on both, since it's the
slowest job and there's no point paying for it if a cheap unit test
already failed; `deploy` waits on all three.

## Before merging a PR

1. Open the PR against `master`. This triggers the three test jobs (not
   deploy).
2. All three must pass. There's no formal branch-protection rule
   enforcing this yet — if you want GitHub to physically block merging on
   red CI, add a branch protection rule on `master` requiring
   `backend-tests`, `frontend-tests`, and `integration-and-e2e` as
   required status checks (**Settings → Branches**).
3. Merge. The push to `master` this creates triggers the full pipeline,
   including deploy.

## Deploys

A deploy is: SSM tells the EC2 instance to `git fetch` + `git reset
--hard origin/master`, then `docker compose up -d --build`, then the
pipeline curls `/healthz` on the instance to confirm it came back up. See
`deployment.md` for the mechanics.

**Optional extra gate:** the `deploy` job runs against the `production`
GitHub Environment. Add required reviewers to that environment
(**Settings → Environments → production**) if you want a human to approve
every deploy before it happens, rather than it firing automatically on
merge.

**Watching a deploy:** the `Actions` tab, on the workflow run for the
merge commit. The `deploy` job's steps show the instance/IP it resolved,
the SSM command id, and the final health check.

## When a deploy fails

The pipeline fails loudly rather than leaving things ambiguous — check
which step failed:

- **"Look up the running instance" fails** — the `expense-splitter`
  CloudFormation stack doesn't exist, or the deploy role can't read it.
  The app stack itself needs fixing first (see
  `infra/cloudformation/README.md`); this isn't something re-running the
  pipeline will fix.
- **"Deploy the new commit via SSM Run Command" fails** — the command
  ran but errored on the instance (a Docker build failure, a git
  conflict, disk full, etc.). The job prints the SSM command's output on
  failure; read that first. The instance is still running whatever code
  it had before this command started — a failed deploy doesn't take the
  site down by itself, unless the failure happens partway through
  `docker compose up -d --build` recreating a container.
- **"Validate the deploy by checking the health endpoint" fails** — SSM
  reported success, but the app isn't responding. SSH or SSM into the
  instance and check `docker compose logs` in `/opt/app` — likely a
  runtime error in the new code that only surfaces once containers
  actually start.

## Rolling back

Two options, roughly in order of preference:

1. **Forward fix (default).** `git revert` the bad commit(s) on `master`
   and push. This goes through the normal pipeline — tests run again,
   then it deploys the reverted code. Slower, but it's the same trusted
   path every other change takes, and leaves a clean history of what
   happened.
2. **Manual emergency rollback.** If a revert-and-wait-for-CI is too slow
   for the moment, SSM or SSH into the instance directly:
   ```bash
   cd /opt/app
   git reset --hard <last-good-sha>
   docker compose up -d --build
   ```
   Do this only to stop the bleeding — follow up with a proper revert PR
   afterwards so `master` and the running instance agree again. A manual
   change to the instance that never gets reflected in `master` will be
   silently overwritten by the next normal deploy.

## Versioning

None currently — every merge to `master` is, in effect, a release, and
the running instance's state is "whatever `origin/master` pointed to at
the last successful deploy." If this project ever needs to correlate a
specific deployed build with a version number (e.g. for a changelog or a
support ticket), the natural next step is tagging the commit CI deploys
(`git tag` in the `deploy` job) rather than retrofitting semantic
versioning onto an app with no independent release cadence yet.
