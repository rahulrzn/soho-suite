# ==========================================
# Stage 1: Build the Spring Boot application
# ==========================================
FROM eclipse-temurin:25-jdk AS builder

WORKDIR /build

# Copy Maven wrapper and POM first for layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Normalize line endings and set Linux execution permission
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Download dependencies (fail if this step fails)
RUN ./mvnw dependency:go-offline -B

# Copy backend source code
COPY src/ src/

# Build the production executable JAR
RUN ./mvnw clean package -DskipTests -B

# Verify exactly one executable JAR was generated
RUN set -eu; \
    JAR_COUNT="$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*.original' | wc -l)"; \
    test "$JAR_COUNT" -eq 1; \
    JAR="$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*.original' -print -quit)"; \
    cp "$JAR" /build/app.jar


# ==========================================
# Stage 2: Production runtime
# ==========================================
FROM eclipse-temurin:25-jre

WORKDIR /app

# Create an unprivileged user
RUN groupadd -r soho && useradd -r -g soho -d /app -s /sbin/nologin soho

# Copy executable JAR with correct ownership
COPY --from=builder --chown=soho:soho /build/app.jar /app/app.jar

# Run as non-root user
USER soho

# Render supplies PORT dynamically
ENV PORT=8080
EXPOSE 8080

# JVM settings for a memory-limited container
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=60.0", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", \
    "/app/app.jar"]