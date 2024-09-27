FROM node:20.17.0-alpine@sha256:2d07db07a2df6830718ae2a47db6fedce6745f5bcd174c398f2acdda90a11c03
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