FROM azul/zulu-openjdk-alpine:25.0.4.1-jre@sha256:4298602efa327d6ddaf26d8dc0c4b5f3b6fcfc6b3a173df15f2ddc7ed3ff4d87
VOLUME /tmp
ARG JAR_FILE
RUN apk --no-cache add bash
# Add libc6-compat to support snappy compression for kafka
RUN apk add --no-cache libc6-compat
ENV SPRING_CONFIG_NAME=classpath:/application.yml,common,application,cards-publication
ENV SPRING_CONFIG_LOCATION=classpath:/application.yml,./config/,./external-config/
COPY build/docker/add-certificates.sh /add-certificates.sh
COPY build/docker/java-config-docker-entrypoint.sh /docker-entrypoint.sh
COPY build/libs/${JAR_FILE} app.jar
RUN mkdir -p /config
RUN mkdir -p /external-config
ENTRYPOINT ["/docker-entrypoint.sh"]
