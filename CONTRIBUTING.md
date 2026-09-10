# Contributing

## Agent-owned shipping

The maintainer's request authorizes the requested work and its normal
implementation steps; never ask for approval of the same work again. The agent
owns implementation, proportional tests, independent review, repairs, package
verification and release preparation. Once gates pass, carry out the requested
merge/release and verify registry, artifact and runtime readback. Report versions,
channel, checks and material limits; reuse valid evidence and batch dependent
packages. Do not ask the maintainer to operate engineering tools. Merge-only
requests do not imply publication or private-package visibility changes; release
requests already authorize release. If shipping was not requested, report
readiness without publishing. Escalate only an unavoidable external requirement,
unrepairable gate, product decision or material scope change.

## Contribution checks

Read AGENTS.md. Use a dedicated worktree and branch from freshly fetched main.
Keep one coherent change per PR. Run `npm ci`, `npm run verify`,
`npm run release:check`, the packed Docker smoke and `git diff --check`.
Use synthetic providers and isolated state; never reuse real credentials in tests.
Open a draft PR with the tested commit, artifact hash and outstanding QA.
Independent human or agent review and green CI precede an authorized merge.
New substantive changes require renewed review. Publication is a separate decision.
Keep the worktree while review or QA is open. Never force cleanup or commit others' work.

For releases, keep package/manifest versions aligned, update CHANGELOG.md, inspect
Git history and the npm allowlist for private content, and pack with ignore-scripts.
Verify installation from that tarball without sibling checkouts. Publish the
reviewed artifact as beta, attach its SHA-256 to the matching GitHub prerelease,
and download/read back the published artifact. Never replace a published version.
Native Node built-ins only; no third-party runtime dependencies. Docker base image
components retain their own licenses. No public container image is published here.

## Shared beta publisher

`.github/workflows/publish-beta.yml` is a generated caller of the reviewed,
SHA-pinned shared publisher in `jdorado/ez-agents`. Keep the reusable workflow
reference and `publisher-sha` on the same full commit; regenerate through a
reviewed PR when upgrading. Required checks are `verify` and `docker` from
`.github/workflows/ci.yml`, successful on the exact source commit's push to
`main`. Review the check list whenever CI policy changes.

Follow the [shared publishing procedure](https://github.com/jdorado/ez-agents/blob/main/docs/trusted-publishing.md)
for caller regeneration, receipt fields, dispatch and failure reconciliation.
Complete this repository's contribution checks, packed installation QA and
independent review before release. Stage the exact tested tarball as
`candidate.tgz` with `release-receipt.json` on a draft prerelease `vVERSION`,
whose tag resolves to the tested current `main` commit. The receipt binds
`jdorado/ez_composio`, `@jc_stack/ez-composio`, version, full source SHA,
SHA-256 and public independent-review/test evidence URLs. Dispatch the caller
on `main` with the numeric draft release ID, version, source SHA and independently
verified SHA-256. Actions validates and publishes those bytes without rebuilding.
Only `X.Y.Z-beta.N` versions published to the `latest` dist-tag are supported.

The npm package owner must separately authenticate and enroll `jdorado/ez_composio`
and caller filename `publish-beta.yml`, with direct publication enabled and no
environment (the shared job currently declares none). npm validates the caller
identity for reusable workflows. Verify enrollment with npm settings or
`npm trust list @jc_stack/ez-composio`; workflow merge does not establish trust.
Keep npm tokens and private profiles out of Actions and test containers.

Preserve Actions registry readback and artifact hash on the release record,
then finish and read back the public GitHub prerelease and required installation
QA. After uncertain publication, inspect registry state before retrying. Never
publish to probe authentication or overwrite a version.

Beta.2 is published. Future releases use the latest tag through the shared
publisher; existing registry artifacts are immutable.
