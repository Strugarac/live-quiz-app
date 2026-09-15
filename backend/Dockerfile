# ---- 1. faza: build ----
# Maven + JDK 21 samo za pravljenje JAR-a; ne ulazi u finalni image.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Prvo samo pom.xml, da Docker kesira preuzete zavisnosti dok se pom ne promeni.
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

# ---- 2. faza: runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
