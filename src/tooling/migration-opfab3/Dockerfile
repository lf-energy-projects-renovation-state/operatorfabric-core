FROM node:20.18.0-alpine@sha256:c13b26e7e602ef2f1074aef304ce6e9b7dd284c419b35d89fcf3cc8e44a8def9
COPY package.json /
RUN npm install
COPY migration-opfab3.js /
COPY migration-opfab3-entrypoint.sh /
RUN mkdir -p /bundles
ENTRYPOINT ["/migration-opfab3-entrypoint.sh"]