# ez-composio

Independent plugin; keep provider code out of the Ez relay. Native Node 22 APIs,
no database or model loop. Agent decides which tools to discover/connect/use.
Read README.md and skills/composio/SKILL.md before changing the interface.

`npm run verify` tests the CLI/broker boundary with synthetic data.
`node test/docker-smoke.mjs` needs Docker and the sibling ezenciel_agents manager.
Keep all real credentials, enrollment files and receipts outside the repository.
Do not register or connect a real agent as part of a test. Never retry provider
writes automatically. Changes to session binding and receipts require negative
tests for cross-agent access and ambiguous outcomes.
