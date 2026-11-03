package com.sohosuite.backend;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayConnectionDetails;
import org.testcontainers.postgresql.PostgreSQLContainer;

final class TestDatabaseSafety {

    private TestDatabaseSafety() {}

    static void migrateIfIsolated(
            Flyway flyway,
            PostgreSQLContainer testContainer,
            DataSource dataSource,
            FlywayConnectionDetails flywayConnectionDetails,
            String expectedDatabaseName) {
        if (!testContainer.isRunning()
                || !expectedDatabaseName.equals(testContainer.getDatabaseName())) {
            refuseMigration();
        }

        String expectedUrl = testContainer.getJdbcUrl();
        boolean hikariDataSource = dataSource instanceof HikariDataSource;
        boolean dataSourceMatches = hikariDataSource
                && expectedUrl.equals(((HikariDataSource) dataSource).getJdbcUrl());
        boolean flywayUrlMatches = expectedUrl.equals(flywayConnectionDetails.getJdbcUrl());
        if (!dataSourceMatches || !flywayUrlMatches) {
            throw new IllegalStateException(
                    "Refusing to run Flyway: isolated-target check failed (Hikari datasource=" + hikariDataSource
                            + ", datasource URL matches container=" + dataSourceMatches
                            + ", Flyway connection details match container=" + flywayUrlMatches + ")");
        }

        flyway.migrate();
    }

    private static void refuseMigration() {
        throw new IllegalStateException(
                "Refusing to run Flyway: datasource and Flyway must target the disposable PostgreSQL test container");
    }
}
