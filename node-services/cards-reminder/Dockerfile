FROM node:20.14.0-alpine@sha256:804aa6a6476a7e2a5df8db28804aa6c1c97904eefb01deed5d6af24bb51d0c81
RUN apk add --no-cache tzdata
WORKDIR /usr/app
RUN chown node:node /usr/app
RUN mkdir -m777 /var/log/opfab
USER node
COPY build ./build
RUN mkdir -m777 config
COPY config/default-docker.yml ./config/base.yml
COPY package.json ./
COPY package-lock.json ./
COPY startCardsReminder.sh ./
COPY node_modules ./node_modules
ENTRYPOINT ["./startCardsReminder.sh"]