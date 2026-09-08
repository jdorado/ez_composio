# ez-composio

An independent, MIT-licensed Ez plugin for on-demand Composio discovery, account
connection and native tool execution. Node 22 built-ins only; no dependencies.
One alias, `ez composio`, keeps the agent context small. All toolkits remain
searchable; availability and managed OAuth support depend on Composio.

## Architecture

Agent CLI → HTTPS broker → agent-bound Composio session → connected provider.
The public plugin contains no shared API key. The instance operator hosts the
broker and owns its Composio project, billing and data-processing relationship.
Composio stores Google/provider tokens. The client stores an agent credential in
its private Docker volume. The broker maps its SHA-256 hash to a fixed session;
clients cannot select another session or user. This bearer credential grants
access to that session: keep it private. Same-host Docker administrators are trusted.
The broker is separate from the relay and is not installed in an agent container.

## Install through Ez

Ez's agent-led setup preinstalls this separate, removable bridge and supplies
private broker enrollment. Provider accounts connect when the user requests a
service. The agent can discover Gmail from “open my Gmail” without requiring
the user to name Composio. Installed state is read from the registry; uninstall
is respected and does not trigger automatic reinstallation.

Inspect this checkout with the existing manager:
`ez plugins inspect composio --source /absolute/ez_composio`.
Review it, then use the returned source/revision with `ez plugins catalog-add`
and `ez plugins install composio`. `ez plugins start composio` starts its inert
container. The manager generates Compose and registers the skill automatically.
No Google or Composio accounts are connected by installation.

The installing agent handles the operator steps below on the owner's behalf.
The owner is not expected to find another administrator or prepare enrollment.
If the project API key is missing, ask them to provide it from
[Composio Dashboard](https://dashboard.composio.dev), Platform → project →
Settings → API Keys. Handle all technical setup and verification after receipt.
Keep the key in private broker configuration, never echo it or put it in argv,
logs, repository files or agent Markdown. A private conversation may receive the
requested key; do not claim that conversation history is a secret vault.

The installing agent privately imports generated enrollment JSON on stdin:
`ez composio init < /private/enrollment.secret.json`.
Do not expose generated enrollment tokens in chat. Init atomically stores only broker/token in
`/state/connection.json` (0600). Use `ez composio --help`, `doctor`,
`search 'Find a HubSpot contact'`, `connect hubspot work`, then search again.
Execute an action slug from discovery using JSON stdin:
`{"arguments":{},"account":"account-from-discovery","key":"stable-operation-key"}`.
Read the actual schema before filling arguments. All outputs are JSON;
diagnostics go to stderr, exit 1 signals transport/input failure. A provider's
JSON may describe an unsuccessful operation despite HTTP 200: inspect it.

## Host the broker

Create private operator config outside the checkout (0600):
`{"apiKey":"YOUR_COMPOSIO_PROJECT_KEY","receiptsDirectory":"/state/receipts","agents":{}}`.
Set `EZ_COMPOSIO_BROKER_CONFIG` to its absolute path and run
`docker compose -f compose.broker.yaml up --build -d`.
Put an HTTPS reverse proxy in front of the loopback-only port 8080; do not log
Authorization headers, bodies or consent links. Configure rate limits there.
No production endpoint or Privy integration is provisioned by this repository.

Provision a client from the trusted operator environment:
`node src/provision.mjs /private/broker.secret.json /private/new-agent < /private/request.secret.json`.
Request JSON is `{"userId":"stable-owner-and-agent-id","broker":"https://YOUR-BROKER"}`.
This creates a real Composio session (may consume vendor resources), writes a
binding fragment and enrollment into a new private directory, and prints no secrets.
Merge that fragment into the broker config's `agents` map, preserving others.
The broker rereads the file per request; removing a binding revokes the client.
Use a distinct Composio user ID per agent to avoid ambient cross-agent accounts.
Provisioning runs in the trusted setup environment, including an installing agent
acting for the owner. Never distribute the project key or this config to clients.
An application's existing login can later authorize this provisioning operation;
the client does not claim to validate Privy sessions itself.

Session expiration requires explicit reprovisioning. Account selection is explicit.
There are no retries, generic HTTP proxy, arbitrary code execution, webhook
receiver, background workflows or provider-specific mappings. Search uses direct
tool search; the agent owns composition. Writes have no local deduplication
guarantee across provider systems: local receipts reserve the supplied key before
execution. Same key returns its receipt; changed arguments fail. `operation KEY`
returns `uncertain` or `returned` plus the provider response. Inspect that response
and read back the provider object; `returned` alone does not mean success. Never
use a new key to retry an uncertain write. Receipts may contain private provider
data and are retained in the broker volume; back up/protect that volume.

## Verification and status

`npm run verify` tests tenant isolation, unknown fields, secret handling and CLI
HTTP behavior with a synthetic provider. Docker/manager smoke instructions are
in `test/docker-smoke.mjs`. Live OAuth and provider actions require a deployed
broker, project credentials and user consent; offline tests do not prove them.

Provider contract: [Composio sessions v3.1](https://docs.composio.dev/reference/api-reference/tool-router),
[search](https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSessionBySessionIdSearch),
[connect](https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSessionBySessionIdLink),
[execute](https://docs.composio.dev/reference/api-reference/tool-router/postToolRouterSessionBySessionIdExecute).
Checked September 7, 2026. Composio is an external hosted dependency; publishing
this source does not make the hosted service self-hosted or free without limits.
