FROM azul/zulu-openjdk-alpine:17.0.13-jre@sha256:7a7a69dcf8ec33fb9ad6f233f50cc695073b711e0674e67e7b4d63853c485212
VOLUME /tmp
ARG JAR_FILE
RUN apk --no-cache add bash
# Add libc6-compat to support snappy compression for kafka
RUN apk add --no-cache libc6-compat
ENV SPRING_CONFIG_NAME classpath:/application.yml,common,application,cards-publication
ENV SPRING_CONFIG_LOCATION classpath:/application.yml,./config/,./external-config/
COPY build/docker/add-certificates.sh /add-certificates.sh
COPY build/docker/java-config-docker-entrypoint.sh /docker-entrypoint.sh
COPY build/libs/${JAR_FILE} app.jar
RUN mkdir -p /config
RUN mkdir -p /external-config
ENTRYPOINT ["/docker-entrypoint.sh"]
