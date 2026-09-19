# Third-party notices

This repository's original source is MIT licensed under `LICENSE`. It has no
npm runtime dependencies and uses only Node.js built-in APIs in the published
package; no third-party npm source or `node_modules` tree is bundled.

The Docker image is built from the pinned official Node.js
`22.22.0-bookworm-slim` base image. Node.js is MIT licensed; the Debian base
components retain their own copyright and license terms and notices in the
image. This repository publishes source and Docker build instructions, not a
prebuilt container image, so any operator-built image remains subject to those
component terms.

Composio is an external hosted service reached through its documented HTTP API.
This repository does not bundle a Composio SDK or provider implementation;
Composio's service terms, privacy terms and data-processing obligations apply
separately to each operator's use of that service.

Upstream references:

- Node.js license: https://github.com/nodejs/node/blob/v22.22.0/LICENSE
- Node.js container image: https://github.com/nodejs/docker-node
