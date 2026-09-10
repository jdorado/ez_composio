# Changelog

## 0.1.0-beta.2

- Expose native file upload requests with private per-agent operation receipts, enabling binary provider uploads without exporting credentials.
- Keep credentials broker-side, validate native upload metadata, and retain
  uncertain outcomes without automatic provider-write replay.
- Preserve private installer file access and make verified shipping proactive
  and agent-owned. Fresh-host OAuth/reboot acceptance remains pending.

## 0.1.0-beta.1

First packaged beta: agent-owned key setup and session enrollment, private
Docker IPC broker, native tool search, paginated toolkit discovery, full tool
schemas, OAuth links, explicit-account execution and uncertainty receipts.

Fixes secret reflection from invalid JSON and ships complete install/build files.
Broker configuration updates use a private directory/volume so atomic replacement
and revocation are visible without restarting the service.

Beta limits: external Composio availability and managed OAuth scopes vary;
no automatic session renewal, provider write retries or exactly-once guarantee.
Fresh-host real OAuth/reboot acceptance remains pending. Automated Docker QA uses
synthetic accounts. Existing pre-beta hosted profiles remain supported; migrating
local loopback installations requires changing the enrollment endpoint to private
IPC and moving broker state/receipts as documented in README.md.
