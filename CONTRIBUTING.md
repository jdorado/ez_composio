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
