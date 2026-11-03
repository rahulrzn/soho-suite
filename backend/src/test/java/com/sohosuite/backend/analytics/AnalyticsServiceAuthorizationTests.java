package com.sohosuite.backend.analytics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigRequest;
import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigResponse;
import com.sohosuite.backend.analytics.dto.MetricStatus;
import com.sohosuite.backend.analytics.entity.DatasetAnalyticsConfiguration;
import com.sohosuite.backend.analytics.repository.DatasetAnalyticsConfigurationRepository;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AnalyticsServiceAuthorizationTests {

    private static final long BUSINESS_ID = 41L;
    private static final long DATASET_ID = 90L;
    private static final String FIREBASE_UID = "analytics-user";

    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final DatasetRepository datasets = mock(DatasetRepository.class);
    private final DatasetRowRepository rows = mock(DatasetRowRepository.class);
    private final DatasetAnalyticsConfigurationRepository configurations = mock(DatasetAnalyticsConfigurationRepository.class);
    private final AnalyticsService service = new AnalyticsService(
            memberships, datasets, rows, configurations);
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity(
            FIREBASE_UID, "analytics@example.test", true);

    @BeforeEach
    void clearMocks() {
        org.mockito.Mockito.clearInvocations(memberships, datasets, rows, configurations);
    }

    @Test
    void nonMembersCannotConfigureOrReadAnalytics() {
        when(memberships.findForFirebaseUserAndBusiness(FIREBASE_UID, BUSINESS_ID)).thenReturn(Optional.empty());

        assertThrows(BusinessAccessDeniedException.class,
                () -> service.configure(identity, BUSINESS_ID, validRequest()));
        assertThrows(BusinessAccessDeniedException.class,
                () -> service.overview(identity, BUSINESS_ID, LocalDate.parse("2026-05-01"), LocalDate.parse("2026-05-01")));
        verifyNoInteractions(datasets, rows, configurations);
    }

    @Test
    void viewerCanReadButCannotConfigureAnalytics() {
        allowRole(BusinessRole.VIEWER);
        when(configurations.findByBusinessId(BUSINESS_ID)).thenReturn(Optional.of(configuration()));
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(importedDataset()));
        when(rows.countByDatasetId(DATASET_ID)).thenReturn(0L);

        assertThrows(BusinessAccessDeniedException.class,
                () -> service.configure(identity, BUSINESS_ID, validRequest()));
        var overview = service.overview(identity, BUSINESS_ID,
                LocalDate.parse("2026-05-01"), LocalDate.parse("2026-05-01"));
        assertEquals(DATASET_ID, overview.datasetId());
        assertEquals(MetricStatus.UNAVAILABLE, overview.totalSalesAmount().status());

        verify(configurations, never()).save(any());
        verify(datasets).findByBusinessIdAndId(BUSINESS_ID, DATASET_ID);
    }

    @Test
    void ownersAndManagersCanConfigureAnalytics() {
        for (BusinessRole role : List.of(BusinessRole.OWNER, BusinessRole.MANAGER)) {
            org.mockito.Mockito.reset(memberships, datasets, rows, configurations);
            allowRole(role);
            when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(importedDataset()));
            when(configurations.save(any(DatasetAnalyticsConfiguration.class)))
                    .thenAnswer(invocation -> (DatasetAnalyticsConfiguration) invocation.getArgument(0));

            AnalyticsDatasetConfigResponse saved = service.configure(identity, BUSINESS_ID, validRequest());

            assertEquals(DATASET_ID, saved.datasetId());
            assertEquals("Order date", saved.dateColumn());
            assertEquals("Line amount", saved.lineAmountColumn());
            assertEquals("USD", saved.confirmedCurrency());
            verify(configurations).save(any(DatasetAnalyticsConfiguration.class));
        }
    }

    @Test
    void crossBusinessDatasetIdsAreNotRevealedOrConfigured() {
        allowRole(BusinessRole.OWNER);
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.empty());

        assertThrows(java.util.NoSuchElementException.class,
                () -> service.configure(identity, BUSINESS_ID, validRequest()));

        verify(configurations, never()).save(any());
        verifyNoInteractions(rows);
    }

    @Test
    void configurationRejectsUnconfirmedCurrencyAndColumnsAbsentFromTheDataset() {
        allowRole(BusinessRole.OWNER);
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(importedDataset()));

        AnalyticsDatasetConfigRequest wrongCurrency = new AnalyticsDatasetConfigRequest(
                DATASET_ID, "Order date", "Line amount", "Order ID", "Customer ID", "EUR");
        AnalyticsDatasetConfigRequest unknownColumn = new AnalyticsDatasetConfigRequest(
                DATASET_ID, "Order date", "Net sales", "Order ID", "Customer ID", "USD");

        assertThrows(IllegalArgumentException.class, () -> service.configure(identity, BUSINESS_ID, wrongCurrency));
        assertThrows(IllegalArgumentException.class, () -> service.configure(identity, BUSINESS_ID, unknownColumn));
        verify(configurations, never()).save(any());
    }

    @Test
    void configurationRequiresEveryMandatoryColumnMapping() {
        allowRole(BusinessRole.OWNER);
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(importedDataset()));
        AnalyticsDatasetConfigRequest missingDate = new AnalyticsDatasetConfigRequest(
                DATASET_ID, " ", "Line amount", "Order ID", null, "USD");

        assertThrows(IllegalArgumentException.class, () -> service.configure(identity, BUSINESS_ID, missingDate));
        verify(configurations, never()).save(any());
    }

    @Test
    void configurationRejectsDatasetsThatHaveNotBeenConfirmed() {
        allowRole(BusinessRole.MANAGER);
        Dataset pending = importedDataset();
        pending.setStatus("PENDING_REVIEW");
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(pending));

        assertThrows(IllegalArgumentException.class,
                () -> service.configure(identity, BUSINESS_ID, validRequest()));
        verify(configurations, never()).save(any());
    }

    @Test
    void unconfiguredBusinessReceivesExplicitUnavailableMetrics() {
        allowRole(BusinessRole.VIEWER);

        var result = service.overview(identity, BUSINESS_ID,
                LocalDate.parse("2026-05-01"), LocalDate.parse("2026-05-01"));

        assertEquals(MetricStatus.UNAVAILABLE, result.totalSalesAmount().status());
        assertEquals(MetricStatus.UNAVAILABLE, result.dailySalesTrend().status());
        assertEquals("USD", result.currency());
        verifyNoInteractions(datasets, rows);
    }

    @Test
    void oversizedDatasetIsUnavailableWithoutLoadingRows() {
        allowRole(BusinessRole.MANAGER);
        Dataset oversized = importedDataset();
        oversized.setRowCount(20_001);
        when(configurations.findByBusinessId(BUSINESS_ID)).thenReturn(Optional.of(configuration()));
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(oversized));
        when(rows.countByDatasetId(DATASET_ID)).thenReturn(20_001L);

        var result = service.overview(identity, BUSINESS_ID,
                LocalDate.parse("2026-05-01"), LocalDate.parse("2026-05-01"));

        assertEquals(MetricStatus.UNAVAILABLE, result.totalSalesAmount().status());
        verify(rows, never()).findAllByDatasetIdOrderByRowNumber(any(), any());
    }

    @Test
    void changedBusinessCurrencyRequiresAnalyticsConfigurationToBeConfirmedAgain() {
        allowRole(BusinessRole.OWNER);
        DatasetAnalyticsConfiguration staleCurrency = configuration();
        staleCurrency.setConfirmedCurrency("EUR");
        when(configurations.findByBusinessId(BUSINESS_ID)).thenReturn(Optional.of(staleCurrency));
        when(datasets.findByBusinessIdAndId(BUSINESS_ID, DATASET_ID)).thenReturn(Optional.of(importedDataset()));

        var result = service.overview(identity, BUSINESS_ID,
                LocalDate.parse("2026-05-01"), LocalDate.parse("2026-05-01"));

        assertEquals(MetricStatus.UNAVAILABLE, result.totalSalesAmount().status());
        assertEquals("The business currency changed; confirm the dataset currency again.",
                result.totalSalesAmount().reason());
        verifyNoInteractions(rows);
    }

    private void allowRole(BusinessRole role) {
        Business business = new Business();
        business.setId(BUSINESS_ID);
        business.setBusinessCurrency("USD");
        BusinessMembership membership = new BusinessMembership();
        membership.setBusiness(business);
        membership.setRole(role);
        when(memberships.findForFirebaseUserAndBusiness(FIREBASE_UID, BUSINESS_ID))
                .thenReturn(Optional.of(membership));
    }

    private Dataset importedDataset() {
        Dataset dataset = new Dataset();
        dataset.setId(DATASET_ID);
        dataset.setBusinessId(BUSINESS_ID);
        dataset.setStatus("IMPORTED");
        dataset.setRowCount(0);
        dataset.setColumnsJson("[{\"name\":\"Order date\"},{\"name\":\"Line amount\"},{\"name\":\"Order ID\"},{\"name\":\"Customer ID\"}]");
        return dataset;
    }

    private DatasetAnalyticsConfiguration configuration() {
        DatasetAnalyticsConfiguration config = new DatasetAnalyticsConfiguration();
        config.setDatasetId(DATASET_ID);
        config.setDateColumn("Order date");
        config.setLineAmountColumn("Line amount");
        config.setOrderIdColumn("Order ID");
        config.setCustomerIdColumn("Customer ID");
        config.setConfirmedCurrency("USD");
        return config;
    }

    private AnalyticsDatasetConfigRequest validRequest() {
        return new AnalyticsDatasetConfigRequest(
                DATASET_ID, "Order date", "Line amount", "Order ID", "Customer ID", "USD");
    }
}
