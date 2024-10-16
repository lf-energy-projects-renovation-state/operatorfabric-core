FROM azul/zulu-openjdk-alpine:17.0.12-jre@sha256:6912cb1fbb3bcf1d7e07013edd1f9f254cef9491157344be9d60f840e85b9a5f
VOLUME /tmp
ARG JAR_FILE
RUN apk --no-cache add bash
ENV SPRING_CONFIG_NAME common,application,businessconfig
ENV SPRING_CONFIG_LOCATION classpath:/application.yml,./config/,./external-config/
COPY build/docker/add-certificates.sh /add-certificates.sh
COPY build/docker/java-config-docker-entrypoint.sh /docker-entrypoint.sh
COPY build/libs/${JAR_FILE} app.jar
RUN mkdir -p /config
RUN mkdir -p /external-config
ENTRYPOINT ["/docker-entrypoint.sh"]
