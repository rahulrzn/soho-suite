package com.sohosuite.backend.dataset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.repository.DatasetIdempotencyLock;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.dataset.service.DatasetService;
import com.sohosuite.backend.exception.DatasetIdempotencyConflictException;
import com.sohosuite.backend.exception.GlobalExceptionHandler;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class DatasetIdempotencyTests {
    private static final Long BUSINESS_ID = 8L;
    private static final String KEY = "upload-key-1";
    private static final byte[] CSV = "item,quantity\ntea,2\n".getBytes(java.nio.charset.StandardCharsets.UTF_8);

    private DatasetRepository datasets;
    private DatasetRowRepository rows;
    private BusinessMembershipRepository memberships;
    private DatasetIdempotencyLock lock;
    private DatasetService service;

    @BeforeEach
    void setUp() {
        datasets = mock(DatasetRepository.class);
        rows = mock(DatasetRowRepository.class);
        memberships = mock(BusinessMembershipRepository.class);
        lock = mock(DatasetIdempotencyLock.class);
        service = new DatasetService(datasets, rows, memberships, lock);
        ReflectionTestUtils.setField(service, "maxBytes", 5L * 1024 * 1024);
        ReflectionTestUtils.setField(service, "maxRows", 20_000);
        ReflectionTestUtils.setField(service, "maxColumns", 100);
        when(memberships.findForFirebaseUserAndBusiness(anyString(), anyLong()))
                .thenAnswer(invocation -> Optional.of(member(invocation.getArgument(1), 4L)));
    }

    @Test
    void identicalRetryReturnsTheExistingPreviewWithoutCreatingAnotherDatasetOrRows() {
        AtomicReference<Dataset> stored = new AtomicReference<>();
        when(datasets.findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY))
                .thenAnswer(invocation -> Optional.ofNullable(stored.get()));
        when(datasets.saveAndFlush(any(Dataset.class))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            dataset.setId(41L);
            stored.set(dataset);
            return dataset;
        });

        var first = service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), null, null, KEY);
        var retry = service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), null, null, KEY);

        assertEquals(first.get("id"), retry.get("id"));
        assertNotNull(stored.get().getRequestFingerprint());
        verify(datasets, times(1)).saveAndFlush(any(Dataset.class));
        verify(rows, times(1)).saveAll(any());
        org.mockito.InOrder order = inOrder(lock, datasets);
        order.verify(lock).lock(BUSINESS_ID, KEY);
        order.verify(datasets).findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY);
        order.verify(lock).lock(BUSINESS_ID, KEY);
        order.verify(datasets).findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY);
    }

    @Test
    void reusingKeyWithDifferentFileOrImportParametersReturnsConflict() {
        AtomicReference<Dataset> stored = createFirstImport();

        assertThrows(DatasetIdempotencyConflictException.class,
                () -> service.upload(identity("user-a"), BUSINESS_ID, csv("item,quantity\ncoffee,1\n".getBytes()), null, null, KEY));
        assertThrows(DatasetIdempotencyConflictException.class,
                () -> service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), "Different name", null, KEY));

        assertEquals(41L, stored.get().getId());
        verify(datasets, times(1)).saveAndFlush(any(Dataset.class));
        verify(rows, times(1)).saveAll(any());
    }

    @Test
    void legacyDatasetWithoutFingerprintCannotBeSilentlyMatchedToNewPayload() {
        Dataset legacy = new Dataset();
        legacy.setId(41L);
        legacy.setRequestFingerprint(null);
        when(datasets.findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY)).thenReturn(Optional.of(legacy));

        assertThrows(DatasetIdempotencyConflictException.class,
                () -> service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), null, null, KEY));
        verify(datasets, never()).saveAndFlush(any());
        verifyNoInteractions(rows);
    }

    @Test
    void idempotencyMismatchIsReportedAsConflict() {
        var response = new GlobalExceptionHandler().handleIdempotencyConflict(
                new DatasetIdempotencyConflictException("Key reused with different input"));

        assertEquals(409, response.getStatusCode().value());
        assertEquals("IDEMPOTENCY_CONFLICT", response.getBody().get("code"));
    }

    @Test
    void sameKeyIsIndependentAcrossBusinessesButSharedWithinOneBusiness() {
        AtomicReference<Dataset> businessEightDataset = new AtomicReference<>();
        when(datasets.findByBusinessIdAndIdempotencyKey(anyLong(), eq(KEY))).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return id.equals(BUSINESS_ID) ? Optional.ofNullable(businessEightDataset.get()) : Optional.empty();
        });
        when(datasets.saveAndFlush(any(Dataset.class))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            dataset.setId(dataset.getBusinessId().equals(BUSINESS_ID) ? 41L : 42L);
            if (dataset.getBusinessId().equals(BUSINESS_ID)) businessEightDataset.set(dataset);
            return dataset;
        });

        var first = service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), null, null, KEY);
        var sameBusinessRetry = service.upload(identity("user-b"), BUSINESS_ID, csv(CSV), null, null, KEY);
        var otherBusiness = service.upload(identity("user-a"), 9L, csv(CSV), null, null, KEY);

        assertEquals(first.get("id"), sameBusinessRetry.get("id"));
        assertNotEquals(first.get("id"), otherBusiness.get("id"));
        verify(datasets, times(2)).findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY);
        verify(datasets).findByBusinessIdAndIdempotencyKey(9L, KEY);
        verify(lock, times(2)).lock(BUSINESS_ID, KEY);
        verify(lock).lock(9L, KEY);
        verify(datasets, times(2)).saveAndFlush(any(Dataset.class));
    }

    private AtomicReference<Dataset> createFirstImport() {
        AtomicReference<Dataset> stored = new AtomicReference<>();
        when(datasets.findByBusinessIdAndIdempotencyKey(BUSINESS_ID, KEY))
                .thenAnswer(invocation -> Optional.ofNullable(stored.get()));
        when(datasets.saveAndFlush(any(Dataset.class))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            dataset.setId(41L);
            stored.set(dataset);
            return dataset;
        });
        service.upload(identity("user-a"), BUSINESS_ID, csv(CSV), null, null, KEY);
        return stored;
    }

    private MockMultipartFile csv(byte[] bytes) {
        return new MockMultipartFile("file", "sales.csv", "text/csv", bytes);
    }

    private VerifiedFirebaseIdentity identity(String uid) {
        return new VerifiedFirebaseIdentity(uid, uid + "@example.test", true);
    }

    private BusinessMembership member(Long businessId, Long userId) {
        Business business = new Business();
        business.setId(businessId);
        User user = new User();
        user.setId(userId);
        user.setFirebaseUid("firebase-user");
        BusinessMembership membership = new BusinessMembership();
        membership.setBusiness(business);
        membership.setUser(user);
        membership.setRole(BusinessRole.MANAGER);
        return membership;
    }
}
