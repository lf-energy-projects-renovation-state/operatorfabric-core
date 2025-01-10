FROM node:22.13.0-alpine@sha256:f2dc6eea95f787e25f173ba9904c9d0647ab2506178c7b5b7c5a3d02bc4af145
WORKDIR /usr/app
COPY ./ ./
RUN npm ci
COPY migration-entity-roles.js /
COPY migration-entity-roles-entrypoint.sh /
ENTRYPOINT ["/migration-entity-roles-entrypoint.sh"]