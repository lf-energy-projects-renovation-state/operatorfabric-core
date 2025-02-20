FROM node:20.18.3-alpine@sha256:053c1d99e608fe9fa0db6821edd84276277c0a663cd181f4a3e59ee20f5f07ea
COPY package.json /
RUN npm install
COPY migration-opfab3.js /
COPY migration-opfab3-entrypoint.sh /
RUN mkdir -p /bundles
ENTRYPOINT ["/migration-opfab3-entrypoint.sh"]