FROM node:20.15.1-alpine@sha256:09dbe0a53523c2482d85a037efc6b0e8e8bb16c6f1acf431fe36aa0ebc871c06
WORKDIR /usr/app
RUN chown node:node /usr/app
RUN mkdir -m777 /var/log/opfab
USER node
COPY build ./build
RUN mkdir -m777 config
COPY config/default-docker.yml ./config/base.yml
COPY package.json ./
COPY package-lock.json ./
COPY startSupervisor.sh ./
COPY node_modules ./node_modules
ENTRYPOINT ["./startSupervisor.sh"]
