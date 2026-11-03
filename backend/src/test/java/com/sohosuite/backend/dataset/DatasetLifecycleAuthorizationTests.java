package com.sohosuite.backend.dataset;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.repository.DatasetIdempotencyLock;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.dataset.service.DatasetService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DatasetLifecycleAuthorizationTests {
    private final DatasetRepository datasets = mock(DatasetRepository.class);
    private final DatasetRowRepository rows = mock(DatasetRowRepository.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final DatasetService service = new DatasetService(datasets, rows, memberships,
            mock(DatasetIdempotencyLock.class), mock(BusinessActivityService.class));
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);

    @Test
    void datasetFromAnotherBusinessIsNotDeleted() {
        BusinessMembership manager = new BusinessMembership(); manager.setRole(BusinessRole.MANAGER);
        when(memberships.findForFirebaseUserAndBusiness("uid", 4L)).thenReturn(Optional.of(manager));
        when(datasets.findByBusinessIdAndId(4L, 99L)).thenReturn(Optional.empty());

        assertThrows(java.util.NoSuchElementException.class, () -> service.delete(identity, 4L, 99L));

        verify(datasets).findByBusinessIdAndId(4L, 99L);
        verify(rows, never()).deleteAllByDatasetId(99L);
    }
}
