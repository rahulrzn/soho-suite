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
    private BusinessMembershipRepository memberships;
    private UserRepository users;
    private BusinessService service;
    private Business business;
    private Business secondBusiness;
    private User actor;
    private User target;
    private BusinessMembership actorMembership;
    private BusinessMembership targetMembership;
    private BusinessLocationRepository locations;
    private BusinessTaxRegistrationRepository taxes;
    private DepartmentRepository departments;

    @BeforeEach
    void setUp() {
        businesses = mock(BusinessRepository.class);
        memberships = mock(BusinessMembershipRepository.class);
        users = mock(UserRepository.class);
        locations = mock(BusinessLocationRepository.class);
        taxes = mock(BusinessTaxRegistrationRepository.class);
        departments = mock(DepartmentRepository.class);
        service = new BusinessService(businesses, memberships, users, locations, taxes, departments);
        business = new Business();
        business.setId(10L);
        secondBusiness = new Business();
        secondBusiness.setId(20L);
        actor = new User();
        actor.setId(1L);
        actor.setBusiness(business);
        actor.setBusinessRole(BusinessRole.OWNER);
        actorMembership = membership(actor, business, BusinessRole.OWNER);
        target = new User();
        target.setId(2L);
        targetMembership = membership(target, business, BusinessRole.VIEWER);
        when(users.findByFirebaseUid("actor")).thenReturn(Optional.of(actor));
        when(users.findForUpdateByFirebaseUid("actor")).thenReturn(Optional.of(actor));
        when(users.findForUpdateById(2L)).thenReturn(Optional.of(target));
        when(memberships.findForFirebaseUserAndBusiness(eq("actor"), any())).thenAnswer(i ->
                ((Long)i.getArgument(1)).equals(10L) ? Optional.of(actorMembership) : Optional.empty());
        when(memberships.findAllForFirebaseUser("actor")).thenAnswer(i -> List.of(actorMembership));
        when(memberships.findAllForBusiness(10L)).thenAnswer(i -> List.of(actorMembership, targetMembership));
        when(memberships.findByUser_IdAndBusiness_Id(2L, 10L)).thenReturn(Optional.of(targetMembership));
        when(memberships.existsByUser_IdAndBusiness_Id(any(), any())).thenReturn(false);
        when(memberships.save(any(BusinessMembership.class))).thenAnswer(i -> i.getArgument(0));
        when(memberships.findAllByUser_IdOrderById(any())).thenReturn(List.of());
        when(businesses.findById(10L)).thenReturn(Optional.of(business));
        when(businesses.findById(20L)).thenReturn(Optional.of(secondBusiness));
        when(businesses.findForUpdateById(10L)).thenReturn(Optional.of(business));
        when(businesses.findForUpdateById(20L)).thenReturn(Optional.of(secondBusiness));
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(businesses.nextBusinessCodeSequenceValue()).thenReturn(1L);
        when(businesses.saveAndFlush(any(Business.class))).thenAnswer(i -> {
            Business saved = i.getArgument(0);
            saved.setId(10L);
            return saved;
        });
    }

    @Test
    void creationSetsOwnerAndAllowsMultipleBusinesses() {
        actor.setBusiness(null);
        actor.setBusinessRole(null);
        var saved = service.createBusiness("actor", new BusinessRequest());
        assertEquals(10L, saved.id());
        assertEquals("BIZ-00000001", saved.businessCode());
        assertEquals(saved.id(), actor.getBusiness().getId());
        assertEquals(BusinessRole.OWNER, actor.getBusinessRole());
        verify(users).save(actor);
        var second = service.createBusiness("actor", new BusinessRequest());
        assertEquals(saved.id(), second.id());
        verify(memberships, times(2)).save(any(BusinessMembership.class));
    }

    @Test
    void noProfileCannotCreateBusiness() {
        assertThrows(UserNotFoundException.class, () -> service.createBusiness("unknown", new BusinessRequest()));
        verify(businesses, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(BusinessRole.class)
    void membersCanReadOnlyTheirOwnBusiness(BusinessRole role) {
        actorMembership.setRole(role);
        actor.setBusinessRole(role);
        assertEquals(10L, service.getCurrentUserBusinesses("actor").getFirst().id());
        assertEquals(10L, service.getBusinessById("actor", 10L).id());
        assertThrows(BusinessAccessDeniedException.class, () -> service.getBusinessById("actor", 20L));
        verify(businesses, never()).findAll();
        verify(businesses, never()).findById(20L);
    }

    @Test
    void oneUserCanHaveDifferentRolesAcrossBusinesses() {
        BusinessMembership secondRole = membership(actor, secondBusiness, BusinessRole.VIEWER);
        when(memberships.findAllForFirebaseUser("actor")).thenReturn(List.of(actorMembership, secondRole));
        when(memberships.findForFirebaseUserAndBusiness("actor", 20L)).thenReturn(Optional.of(secondRole));
        when(businesses.findById(20L)).thenReturn(Optional.of(secondBusiness));

        assertEquals(2, service.getCurrentUserBusinesses("actor").size());
        assertEquals(10L, service.getBusinessById("actor", 10L).id());
        assertEquals(20L, service.getBusinessById("actor", 20L).id());
        assertThrows(BusinessAccessDeniedException.class,
                () -> service.updateBusiness("actor", 20L, new BusinessRequest()));
        assertThrows(BusinessAccessDeniedException.class, () -> service.addMember("actor", 20L,
                new AddBusinessMemberRequest(2L, BusinessRole.VIEWER)));
        assertThrows(BusinessAccessDeniedException.class, () -> service.updateMemberRole("actor", 20L, 2L,
                new UpdateBusinessMemberRoleRequest(BusinessRole.MANAGER)));
        assertThrows(BusinessAccessDeniedException.class, () -> service.removeMember("actor", 20L, 2L));
        assertEquals(BusinessRole.OWNER, actorMembership.getRole());
        assertEquals(BusinessRole.VIEWER, secondRole.getRole());
    }

    @Test
    void unassignedAndLegacyUnclassifiedUsersHaveNoAccess() {
        actorMembership.setRole(null);
        actor.setBusinessRole(null);
        when(memberships.findAllForFirebaseUser("actor")).thenReturn(List.of());
        when(memberships.findForFirebaseUserAndBusiness("actor", 10L)).thenReturn(Optional.empty());
        assertTrue(service.getCurrentUserBusinesses("actor").isEmpty());
        assertThrows(BusinessAccessDeniedException.class, () -> service.getBusinessById("actor", 10L));
        actorMembership = null;
        assertTrue(service.getCurrentUserBusinesses("actor").isEmpty());
    }

    @ParameterizedTest
    @EnumSource(BusinessRole.class)
    void updatePermissions(BusinessRole role) {
        actorMembership.setRole(role);
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
        actorMembership.setRole(role);
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
        targetMembership.setRole(BusinessRole.OWNER);
        assertThrows(MembershipConflictException.class, () -> service.removeMember("actor", 10L, 2L));
        assertThrows(MembershipConflictException.class, () -> service.updateMemberRole("actor", 10L,
                2L, new UpdateBusinessMemberRoleRequest(BusinessRole.VIEWER)));
        assertThrows(MembershipConflictException.class, () -> service.addMember("actor", 10L,
                new AddBusinessMemberRequest(2L, BusinessRole.OWNER)));
    }

    @Test
    void userCanJoinMultipleBusinesses() {
        Business other = new Business();
        other.setId(20L);
        var added = service.addMember("actor", 10L, new AddBusinessMemberRequest(2L, BusinessRole.VIEWER));
        assertEquals(BusinessRole.VIEWER, added.role());
        BusinessMembership otherMembership = membership(target, other, BusinessRole.MANAGER);
        when(memberships.findByUser_IdAndBusiness_Id(2L, 20L)).thenReturn(Optional.of(otherMembership));
        assertEquals(BusinessRole.MANAGER, memberships.findByUser_IdAndBusiness_Id(2L, 20L).orElseThrow().getRole());
        assertThrows(BusinessAccessDeniedException.class, () -> service.removeMember("actor", 20L, 2L));
    }

    @Test
    void deletingBusinessDetachesMembersBeforeDeletion() {
        when(memberships.findAllForBusiness(10L)).thenReturn(List.of(actorMembership, targetMembership));
        when(memberships.findAllByUser_IdOrderById(1L)).thenReturn(List.of());
        when(memberships.findAllByUser_IdOrderById(2L)).thenReturn(List.of());
        service.deleteBusiness("actor", 10L);
        assertNull(actor.getBusiness());
        assertNull(target.getBusiness());
        assertNull(actor.getBusinessRole());
        assertNull(target.getBusinessRole());
        var order = inOrder(memberships, businesses);
        order.verify(memberships).deleteAll(List.of(actorMembership, targetMembership));
        order.verify(businesses).delete(business);
    }

    private BusinessMembership membership(User user, Business business, BusinessRole role) {
        BusinessMembership membership = new BusinessMembership();
        membership.setUser(user); membership.setBusiness(business); membership.setRole(role); return membership;
    }
}
