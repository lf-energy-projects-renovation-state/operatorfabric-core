FROM nginx:1.27.2-alpine@sha256:74175cf34632e88c6cfe206897cbfe2d2fecf9bf033c40e7f9775a3689e8adc7
VOLUME /tmp
RUN apk --no-cache add bash logrotate \
    && apk del nginx-module-image-filter 
    # deleted unused lib for security reason 
COPY build/distribution /usr/share/nginx/html/
COPY nginx/start-webui.sh /
COPY nginx/nginx-logrotate-conf /etc/logrotate.d/nginx
CMD ["/bin/sh", "/start-webui.sh"]
