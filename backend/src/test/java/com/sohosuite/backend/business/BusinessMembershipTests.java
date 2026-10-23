package com.sohosuite.backend.business;

import java.util.List;
import java.util.Optional;
import com.sohosuite.backend.business.dto.*;
import com.sohosuite.backend.business.entity.*;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.enums.BusinessStatus;
import com.sohosuite.backend.business.enums.BusinessType;
import com.sohosuite.backend.business.enums.LegalStructure;
import com.sohosuite.backend.business.enums.LocationType;
import com.sohosuite.backend.business.enums.TaxRegistrationStatus;
import com.sohosuite.backend.business.repository.*;
import com.sohosuite.backend.business.service.BusinessService;
import com.sohosuite.backend.exception.*;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class BusinessMembershipTests {
    private BusinessRepository businesses;
    private UserRepository users;
    private BusinessService service;
    private Business business;
    private User actor;
    private User target;
    private BusinessLocationRepository locations;
    private BusinessTaxRegistrationRepository taxes;
    private DepartmentRepository departments;

    @BeforeEach
    void setUp() {
        businesses = mock(BusinessRepository.class);
        users = mock(UserRepository.class);
        locations = mock(BusinessLocationRepository.class);
        taxes = mock(BusinessTaxRegistrationRepository.class);
        departments = mock(DepartmentRepository.class);
        service = new BusinessService(businesses, users, locations, taxes, departments);
        business = new Business();
        business.setId(10L);
        actor = new User();
        actor.setId(1L);
        actor.setBusiness(business);
        actor.setBusinessRole(BusinessRole.OWNER);
        target = new User();
        target.setId(2L);
        when(users.findByFirebaseUid("actor")).thenReturn(Optional.of(actor));
        when(users.findForUpdateByFirebaseUid("actor")).thenReturn(Optional.of(actor));
        when(users.findForUpdateById(2L)).thenReturn(Optional.of(target));
        when(businesses.findById(10L)).thenReturn(Optional.of(business));
        when(businesses.findForUpdateById(10L)).thenReturn(Optional.of(business));
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(businesses.nextBusinessCodeSequenceValue()).thenReturn(1L);
        when(businesses.saveAndFlush(any(Business.class))).thenAnswer(i -> {
            Business saved = i.getArgument(0);
            saved.setId(10L);
            return saved;
        });
    }

    @Test
    void creationSetsOwnerAndRejectsSecondBusiness() {
        assertThrows(MembershipConflictException.class, () -> service.createBusiness("actor", new BusinessRequest()));
        verify(businesses, never()).saveAndFlush(any());
        actor.setBusiness(null);
        var saved = service.createBusiness("actor", new BusinessRequest());
        assertEquals(10L, saved.id());
        assertEquals("BIZ-00000001", saved.businessCode());
        assertEquals(saved.id(), actor.getBusiness().getId());
        assertEquals(BusinessRole.OWNER, actor.getBusinessRole());
        verify(users).save(actor);
    }

    @Test
    void noProfileCannotCreateBusiness() {
        assertThrows(UserNotFoundException.class, () -> service.createBusiness("unknown", new BusinessRequest()));
        verify(businesses, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(BusinessRole.class)
    void membersCanReadOnlyTheirOwnBusiness(BusinessRole role) {
        actor.setBusinessRole(role);
        assertEquals(10L, service.getCurrentUserBusinesses("actor").getFirst().id());
        assertEquals(10L, service.getBusinessById("actor", 10L).id());
        assertThrows(BusinessAccessDeniedException.class, () -> service.getBusinessById("actor", 20L));
        verify(businesses, never()).findAll();
        verify(businesses, never()).findById(20L);
    }

    @Test
    void unassignedAndLegacyUnclassifiedUsersHaveNoAccess() {
        actor.setBusinessRole(null);
        assertTrue(service.getCurrentUserBusinesses("actor").isEmpty());
        assertThrows(BusinessAccessDeniedException.class, () -> service.getBusinessById("actor", 10L));
        actor.setBusiness(null);
        assertTrue(service.getCurrentUserBusinesses("actor").isEmpty());
    }

    @ParameterizedTest
    @EnumSource(BusinessRole.class)
    void updatePermissions(BusinessRole role) {
        actor.setBusinessRole(role);
        if (role == BusinessRole.VIEWER) {
            assertThrows(BusinessAccessDeniedException.class,
                    () -> service.updateBusiness("actor", 10L, new BusinessRequest()));
            verify(businesses, never()).save(any());
        } else {
            service.updateBusiness("actor", 10L, new BusinessRequest());
            verify(businesses).saveAndFlush(business);
        }
    }

    @ParameterizedTest
    @EnumSource(value = BusinessRole.class, names = {"MANAGER", "VIEWER"})
    void onlyOwnerManagesMembershipAndDeletes(BusinessRole role) {
        actor.setBusinessRole(role);
        assertThrows(BusinessAccessDeniedException.class, () -> service.addMember("actor", 10L,
                new AddBusinessMemberRequest(2L, BusinessRole.VIEWER)));
        assertThrows(BusinessAccessDeniedException.class, () -> service.updateMemberRole("actor", 10L,
                2L, new UpdateBusinessMemberRoleRequest(BusinessRole.MANAGER)));
        assertThrows(BusinessAccessDeniedException.class, () -> service.removeMember("actor", 10L, 2L));
        assertThrows(BusinessAccessDeniedException.class, () -> service.deleteBusiness("actor", 10L));
        verify(users, never()).save(any());
        verify(businesses, never()).delete(any());
    }

    @Test
    void ownerAddsChangesAndRemovesMember() {
        assertEquals(BusinessRole.VIEWER, service.addMember("actor", 10L,
                new AddBusinessMemberRequest(2L, BusinessRole.VIEWER)).role());
        assertSame(business, target.getBusiness());
        assertEquals(BusinessRole.MANAGER, service.updateMemberRole("actor", 10L,
                2L, new UpdateBusinessMemberRoleRequest(BusinessRole.MANAGER)).role());
        service.removeMember("actor", 10L, 2L);
        assertNull(target.getBusiness());
        assertNull(target.getBusinessRole());
    }

    @Test
    void ownerCannotBeRemovedDemotedOrAssigned() {
        target.setBusiness(business);
        target.setBusinessRole(BusinessRole.OWNER);
        assertThrows(MembershipConflictException.class, () -> service.removeMember("actor", 10L, 2L));
        assertThrows(MembershipConflictException.class, () -> service.updateMemberRole("actor", 10L,
                2L, new UpdateBusinessMemberRoleRequest(BusinessRole.VIEWER)));
        assertThrows(MembershipConflictException.class, () -> service.addMember("actor", 10L,
                new AddBusinessMemberRequest(2L, BusinessRole.OWNER)));
    }

    @Test
    void memberCannotBeTakenFromAnotherBusiness() {
        Business other = new Business();
        other.setId(20L);
        target.setBusiness(other);
        assertThrows(MembershipConflictException.class, () -> service.addMember("actor", 10L,
                new AddBusinessMemberRequest(2L, BusinessRole.VIEWER)));
        assertThrows(UserNotFoundException.class, () -> service.removeMember("actor", 10L, 2L));
        verify(users, never()).save(any());
    }

    @Test
    void deletingBusinessDetachesMembersBeforeDeletion() {
        target.setBusiness(business);
        target.setBusinessRole(BusinessRole.VIEWER);
        when(users.findAllByBusinessId(10L)).thenReturn(List.of(actor, target));
        service.deleteBusiness("actor", 10L);
        assertNull(actor.getBusiness());
        assertNull(target.getBusiness());
        assertNull(actor.getBusinessRole());
        assertNull(target.getBusinessRole());
        var order = inOrder(users, businesses);
        order.verify(users).saveAll(List.of(actor, target));
        order.verify(users).flush();
        order.verify(businesses).delete(business);
    }
}
