FROM node:22.14.0-alpine@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
WORKDIR /usr/app
COPY ./ ./
RUN npm ci
COPY migration-entity-roles.js /
COPY migration-entity-roles-entrypoint.sh /
ENTRYPOINT ["/migration-entity-roles-entrypoint.sh"]