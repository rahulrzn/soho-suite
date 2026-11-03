package com.sohosuite.backend;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.flyway.autoconfigure.FlywayConnectionDetails;
import org.testcontainers.postgresql.PostgreSQLContainer;

class TestDatabaseSafetyTests {

    private static final String DATABASE_NAME = "sohosuite_isolated_test";
    private static final String CONTAINER_URL = "jdbc:postgresql://127.0.0.1:54321/" + DATABASE_NAME;
    private static final String DEVELOPER_URL = "jdbc:postgresql://localhost:5432/sohosuite";

    private final PostgreSQLContainer testContainer = mock(PostgreSQLContainer.class);
    private final HikariDataSource dataSource = mock(HikariDataSource.class);
    private final Flyway flyway = mock(Flyway.class);
    private final FlywayConnectionDetails flywayConnectionDetails = mock(FlywayConnectionDetails.class);

    @BeforeEach
    void setUp() {
        when(testContainer.isRunning()).thenReturn(true);
        when(testContainer.getDatabaseName()).thenReturn(DATABASE_NAME);
        when(testContainer.getJdbcUrl()).thenReturn(CONTAINER_URL);
        when(dataSource.getJdbcUrl()).thenReturn(CONTAINER_URL);
        when(flywayConnectionDetails.getJdbcUrl()).thenReturn(CONTAINER_URL);
    }

    @Test
    void allowsMigrationWhenDatasourceAndFlywayMatchTheRunningTestContainer() {
        assertDoesNotThrow(() -> TestDatabaseSafety.migrateIfIsolated(
                flyway, testContainer, dataSource, flywayConnectionDetails, DATABASE_NAME));
        verify(flyway).migrate();
    }

    @Test
    void refusesDeveloperDatasourceBeforeMigration() {
        when(dataSource.getJdbcUrl()).thenReturn(DEVELOPER_URL);

        assertThrows(IllegalStateException.class, () -> TestDatabaseSafety.migrateIfIsolated(
                flyway, testContainer, dataSource, flywayConnectionDetails, DATABASE_NAME));
        verify(flyway, never()).migrate();
    }

    @Test
    void refusesFlywayConfiguredForDeveloperDatasourceBeforeMigration() {
        when(flywayConnectionDetails.getJdbcUrl()).thenReturn(DEVELOPER_URL);

        assertThrows(IllegalStateException.class, () -> TestDatabaseSafety.migrateIfIsolated(
                flyway, testContainer, dataSource, flywayConnectionDetails, DATABASE_NAME));
        verify(flyway, never()).migrate();
    }

    @Test
    void refusesMigrationWhenTheContainerIsNotRunning() {
        when(testContainer.isRunning()).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> TestDatabaseSafety.migrateIfIsolated(
                flyway, testContainer, dataSource, flywayConnectionDetails, DATABASE_NAME));
        verify(flyway, never()).migrate();
    }
}
