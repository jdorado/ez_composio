FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS runtime
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
RUN mkdir /state /ipc && chown node:node /state /ipc && chmod 700 /state /ipc
USER node
CMD ["node", "-e", "setInterval(()=>{},3600000)"]
FROM runtime AS broker
CMD ["node", "src/broker.mjs", "/run/secrets/broker.json"]
