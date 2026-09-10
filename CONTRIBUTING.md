# Contributing

## Agent-owned shipping

The agent owns implementation, proportional tests, independent review, repairs,
package verification and release preparation. Once ready, proactively present
one concise merge/release confirmation only for missing authority, naming the
prepared packages, versions, channel, checks and material limits. Reuse valid
evidence and existing task or explicit standing authorization; batch dependent
packages. Do not leave ready drafts for the maintainer to discover or ask them
to operate engineering tools. After approval, complete authorized shipping and
registry/artifact/runtime readback. Merge-only approval is not publication or
permission to change private-package visibility. Escalate only product choices,
missing credentials/2FA, unrepairable gates or material scope changes.

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
