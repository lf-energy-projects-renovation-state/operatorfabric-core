FROM azul/zulu-openjdk-alpine:21.0.12.1-jre@sha256:364aea7c5e3b5f17a2f48e0abfe4200166533c6859d0f6cc09857c8f071e65f7
VOLUME /tmp
ARG JAR_FILE
RUN apk --no-cache add bash
ENV SPRING_CONFIG_NAME=common,application,users
ENV SPRING_CONFIG_LOCATION=classpath:/application.yml,./config/,./external-config/
COPY build/docker/add-certificates.sh /add-certificates.sh
COPY build/docker/java-config-docker-entrypoint.sh /docker-entrypoint.sh
COPY build/libs/${JAR_FILE} app.jar
RUN mkdir -p /config
RUN mkdir -p /external-config
ENTRYPOINT ["/docker-entrypoint.sh"]
