package com.sohosuite.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigRequest;
import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.business.repository.BusinessRepository;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.entity.DatasetRow;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.zaxxer.hikari.HikariDataSource;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.flyway.autoconfigure.FlywayConnectionDetails;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(properties = {
        // These unreachable fallbacks make the test fail closed if its container
        // connection details are ever missing or stop taking precedence.
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:1/sohosuite_testcontainer_required",
        "spring.datasource.username=test_only",
        "spring.datasource.password=test_only",
        "spring.flyway.url=jdbc:postgresql://127.0.0.1:1/sohosuite_testcontainer_required",
        "spring.flyway.user=test_only",
        "spring.flyway.password=test_only"
})
@Import(BackendApplicationTests.TestIsolationConfiguration.class)
class BackendApplicationTests {

    private static final String ISOLATED_DATABASE_NAME = "sohosuite_isolated_test";

    @Autowired
    private DataSource dataSource;

    @Autowired
    private Flyway flyway;

    @Autowired
    private FlywayConnectionDetails flywayConnectionDetails;

    @Autowired
    private PostgreSQLContainer postgresTestContainer;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessMembershipRepository membershipRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private DatasetRowRepository datasetRowRepository;

    @MockitoBean(name = "firebaseApp", enforceOverride = true)
    private FirebaseApp firebaseApp;

    @MockitoBean(name = "firebaseAuth", enforceOverride = true)
    private FirebaseAuth firebaseAuth;

    @Test
    void contextLoadsWithoutDeveloperFirebaseCredentialsOrVerification() {
        verifyNoInteractions(firebaseAuth);
    }

    @Test
    void datasourceAndFlywayUseOnlyTheDisposablePostgresContainer() throws Exception {
        assertTrue(postgresTestContainer.isRunning());
        assertEquals(ISOLATED_DATABASE_NAME, postgresTestContainer.getDatabaseName());

        String containerUrl = postgresTestContainer.getJdbcUrl();
        assertTrue(dataSource instanceof HikariDataSource);
        assertEquals(containerUrl, ((HikariDataSource) dataSource).getJdbcUrl());
        assertEquals(containerUrl, flywayConnectionDetails.getJdbcUrl());
        assertEquals("8", flyway.info().current().getVersion().getVersion());

        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("select current_database()")) {
            assertTrue(result.next());
            assertEquals(ISOLATED_DATABASE_NAME, result.getString(1));
        }
    }

    @Test
    void persistsConfigurationAndCalculatesAnalyticsFromBusinessOwnedImportedRows() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Business business = new Business();
        business.setBusinessCode("BIZ-ANL-" + suffix);
        business.setBusinessCurrency("USD");
        business = businessRepository.saveAndFlush(business);

        User user = new User();
        user.setFirebaseUid("analytics-" + suffix);
        user.setUsername("anl_" + suffix.substring(0, 8));
        user.setEmail("analytics-" + suffix + "@example.test");
        user.setFirstName("Analytics");
        user.setLastName("Tester");
        user = userRepository.saveAndFlush(user);

        BusinessMembership membership = new BusinessMembership();
        membership.setBusiness(business);
        membership.setUser(user);
        membership.setRole(BusinessRole.OWNER);
        membershipRepository.saveAndFlush(membership);

        Dataset dataset = new Dataset();
        dataset.setBusinessId(business.getId());
        dataset.setCreatedBy(user.getId());
        dataset.setName("May sales " + suffix);
        dataset.setOriginalFilename("sales.csv");
        dataset.setFileType("CSV");
        dataset.setStatus("IMPORTED");
        dataset.setRowCount(4);
        dataset.setColumnCount(4);
        dataset.setColumnsJson("[{\"name\":\"Order date\"},{\"name\":\"Line amount\"},{\"name\":\"Order ID\"},{\"name\":\"Customer ID\"}]");
        dataset.setFindingsJson("{}");
        dataset.setIdempotencyKey("analytics-" + suffix);
        dataset.setCreatedAt(Instant.now());
        dataset = datasetRepository.saveAndFlush(dataset);

        datasetRowRepository.saveAllAndFlush(List.of(
                datasetRow(dataset.getId(), 1, "[\"2026-05-01\",\"10.00\",\"OLD\",\"old-customer\"]"),
                datasetRow(dataset.getId(), 2, "[\"2026-05-02\",\"10.00\",\"ORDER-A\",\"CUSTOMER-A\"]"),
                datasetRow(dataset.getId(), 3, "[\"2026-05-03\",\"20.00\",\"ORDER-A\",\"CUSTOMER-A\"]"),
                datasetRow(dataset.getId(), 4, "[\"2026-05-03\",\"5.00\",\"ORDER-B\",\"CUSTOMER-B\"]")));

        Long businessId = business.getId();
        Long datasetId = dataset.getId();
        VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity(
                user.getFirebaseUid(), user.getEmail(), true);
        withIdentity(identity, () -> {
            analyticsService.configure(identity, businessId, new AnalyticsDatasetConfigRequest(
                    datasetId, "Order date", "Line amount", "Order ID", "Customer ID", "USD"));
            AnalyticsOverviewResponse result = analyticsService.overview(
                    identity, businessId, LocalDate.parse("2026-05-02"), LocalDate.parse("2026-05-03"));

            assertEquals(datasetId, result.datasetId());
            assertEquals("USD", result.currency());
            assertEquals(0, result.totalSalesAmount().value().compareTo(new java.math.BigDecimal("35.00")));
            assertEquals(2L, result.distinctOrderCount().value());
            assertEquals(0, result.averageOrderValue().value().compareTo(new java.math.BigDecimal("17.50")));
            assertEquals(2L, result.distinctCustomerCount().value());
            assertEquals(2, result.dailySalesTrend().value().size());
            assertEquals(0, new java.math.BigDecimal("250.0000").compareTo(result.salesChangePercent().value()));
        });
    }

    @Test
    void analyticsServiceContinuesToRejectUnverifiedFirebaseIdentities() {
        VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("unverified-user", "unverified@example.test", false);
        assertThrows(AccessDeniedException.class, () -> withIdentity(identity,
                () -> analyticsService.overview(identity, 1L, null, null)));
    }

    private DatasetRow datasetRow(Long datasetId, int number, String values) {
        DatasetRow row = new DatasetRow();
        row.setDatasetId(datasetId);
        row.setRowNumber(number);
        row.setValuesJson(values);
        return row;
    }

    private void withIdentity(VerifiedFirebaseIdentity identity, Runnable action) {
        SecurityContext previous = SecurityContextHolder.getContext();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                identity, null, AuthorityUtils.NO_AUTHORITIES));
        SecurityContextHolder.setContext(context);
        try {
            action.run();
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestIsolationConfiguration {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgresTestContainer() {
            return new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"))
                    .withDatabaseName(ISOLATED_DATABASE_NAME)
                    .withUsername("sohosuite_test")
                    .withPassword("sohosuite_test");
        }

        @Bean
        FlywayMigrationStrategy failClosedFlywayMigrationStrategy(
                PostgreSQLContainer postgresTestContainer,
                DataSource dataSource,
                FlywayConnectionDetails flywayConnectionDetails) {
            return flyway -> TestDatabaseSafety.migrateIfIsolated(
                    flyway, postgresTestContainer, dataSource, flywayConnectionDetails,
                    ISOLATED_DATABASE_NAME);
        }
    }
}
