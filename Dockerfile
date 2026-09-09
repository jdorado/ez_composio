FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS runtime
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN mkdir /state /ipc && chown node:node /state /ipc && chmod 700 /state /ipc
USER node
CMD ["node", "-e", "setInterval(()=>{},3600000)"]
FROM runtime AS broker
CMD ["node", "src/broker.mjs", "/run/secrets/broker.json"]
