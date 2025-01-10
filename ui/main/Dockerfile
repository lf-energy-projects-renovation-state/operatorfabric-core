FROM nginx:1.27.3-alpine@sha256:9b460c5ee96333b43a92df16351e150af717ad6522101e52d05d255cd7241064
VOLUME /tmp
RUN apk --no-cache add bash logrotate \
    && apk del nginx-module-image-filter 
    # deleted unused lib for security reason 
COPY build/distribution /usr/share/nginx/html/
COPY nginx/start-webui.sh /
COPY nginx/nginx-logrotate-conf /etc/logrotate.d/nginx
CMD ["/bin/sh", "/start-webui.sh"]
