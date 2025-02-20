FROM node:20.18.3-alpine@sha256:053c1d99e608fe9fa0db6821edd84276277c0a663cd181f4a3e59ee20f5f07ea
WORKDIR /usr/app
COPY ./ ./
RUN npm ci
COPY migration-entity-roles.js /
COPY migration-entity-roles-entrypoint.sh /
ENTRYPOINT ["/migration-entity-roles-entrypoint.sh"]