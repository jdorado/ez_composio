# Contributing

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
