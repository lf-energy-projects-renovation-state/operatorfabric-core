FROM node:20.14.0-alpine@sha256:804aa6a6476a7e2a5df8db28804aa6c1c97904eefb01deed5d6af24bb51d0c81
WORKDIR /usr/app
RUN chown node:node /usr/app
RUN mkdir ./opfab-cli
COPY src ./opfab-cli/
COPY entryPoint.sh /
RUN chmod +x /entryPoint.sh
WORKDIR ./opfab-cli
# Use --ignore-scripts to improve security
RUN npm install -g --ignore-scripts
RUN mkdir /opfab
RUN chmod 777 /opfab
 #switch to non-root user
USER node 
CMD ["/entryPoint.sh"]