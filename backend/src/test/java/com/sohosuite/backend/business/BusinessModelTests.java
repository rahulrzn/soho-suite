package com.sohosuite.backend.business;

import java.util.List;
import java.util.Optional;

import com.sohosuite.backend.business.dto.BusinessLocationRequest;
import com.sohosuite.backend.business.dto.BusinessRequest;
import com.sohosuite.backend.business.dto.BusinessTaxRegistrationRequest;
import com.sohosuite.backend.business.dto.DepartmentRequest;
import com.sohosuite.backend.business.entity.*;
import com.sohosuite.backend.business.enums.*;
import com.sohosuite.backend.business.repository.*;
import com.sohosuite.backend.business.service.BusinessService;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class BusinessModelTests {
    private BusinessRepository businesses;
    private UserRepository users;
    private BusinessLocationRepository locations;
    private BusinessTaxRegistrationRepository taxes;
    private DepartmentRepository departments;
    private BusinessService service;
    private User owner;

    @BeforeEach
    void setUp() {
        businesses = mock(BusinessRepository.class);
        users = mock(UserRepository.class);
        locations = mock(BusinessLocationRepository.class);
        taxes = mock(BusinessTaxRegistrationRepository.class);
        departments = mock(DepartmentRepository.class);
        service = new BusinessService(businesses, users, locations, taxes, departments);
        owner = new User();
        owner.setId(5L);
        when(users.findForUpdateByFirebaseUid("firebase-owner")).thenReturn(Optional.of(owner));
        when(users.findByFirebaseUid("firebase-owner")).thenReturn(Optional.of(owner));
        when(users.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        when(businesses.saveAndFlush(any(Business.class))).thenAnswer(call -> {
            Business saved = call.getArgument(0);
            if (saved.getId() == null) saved.setId(17L);
            return saved;
        });
        when(locations.save(any(BusinessLocation.class))).thenAnswer(call -> call.getArgument(0));
        when(taxes.save(any(BusinessTaxRegistration.class))).thenAnswer(call -> call.getArgument(0));
        when(departments.save(any(Department.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void createsBusinessFromLegacyRequestAndReturnsLegacyFields() {
        when(businesses.nextBusinessCodeSequenceValue()).thenReturn(31L);
        BusinessRequest request = new BusinessRequest();
        request.setCompanyName("Old client name");
        request.setCountry("India");
        request.setCity("Pune");
        request.setPostalCode("411001");
        request.setDepartment("Sales");

        var response = service.createBusiness("firebase-owner", request);

        assertEquals("BIZ-00000031", response.businessCode());
        assertEquals("Old client name", response.company());
        assertEquals("Old client name", response.tradingName());
        assertEquals("Pune", response.city());
        assertEquals("411001", response.pincode());
        assertEquals("Sales", response.department());
        assertEquals("INR", response.businessCurrency());
        assertEquals(4, response.financialYearStartMonth());
        assertEquals(BusinessStatus.ACTIVE, response.businessStatus());
        assertEquals(17L, owner.getBusiness().getId());
        assertEquals(BusinessRole.OWNER, owner.getBusinessRole());
        verify(locations).save(argThat(location -> location.isRegisteredAddress()
                && "Pune".equals(location.getCity())
                && "411001".equals(location.getPostalCode())));
    }

    @Test
    void businessCodesComeFromTheDatabaseSequenceForEachCreation() {
        when(businesses.nextBusinessCodeSequenceValue()).thenReturn(41L, 42L);
        var first = service.createBusiness("firebase-owner", new BusinessRequest());
        owner.setBusiness(null);
        owner.setBusinessRole(null);
        var second = service.createBusiness("firebase-owner", new BusinessRequest());

        assertEquals("BIZ-00000041", first.businessCode());
        assertEquals("BIZ-00000042", second.businessCode());
        assertNotEquals(first.businessCode(), second.businessCode());
        verify(businesses, times(2)).nextBusinessCodeSequenceValue();
    }

    @Test
    void createsExpandedFieldsAndMultipleChildRecords() {
        when(businesses.nextBusinessCodeSequenceValue()).thenReturn(32L);
        BusinessRequest request = new BusinessRequest();
        request.setTradingName("Modern Trading");
        request.setLegalBusinessName("Modern Trading Private Limited");
        request.setBusinessType(BusinessType.RETAIL);
        request.setLegalStructure(LegalStructure.PRIVATE_LIMITED);
        request.setBusinessCurrency("USD");
        request.setFinancialYearStartMonth(1);
        request.setLocations(List.of(
                new BusinessLocationRequest(null, "HQ", "Head office", LocationType.REGISTERED_OFFICE,
                        "1 Main Road", null, "Pune", "Maharashtra", "411001", "India", true, true),
                new BusinessLocationRequest(null, "STORE-1", "First store", LocationType.STORE,
                        null, null, "Mumbai", "Maharashtra", null, "India", false, true)));
        request.setTaxRegistrations(List.of(
                new BusinessTaxRegistrationRequest(null, "GSTIN", "ABC123", "IN-MH", TaxRegistrationStatus.ACTIVE),
                new BusinessTaxRegistrationRequest(null, "LOCAL_TAX", "TAX456", "IN-MH", null)));
        request.setDepartments(List.of(
                new DepartmentRequest(null, "SALES", "Sales", true),
                new DepartmentRequest(null, "OPS", "Operations", null)));

        var response = service.createBusiness("firebase-owner", request);

        assertEquals("Modern Trading", response.company());
        assertEquals("Modern Trading Private Limited", response.legalBusinessName());
        assertEquals("USD", response.businessCurrency());
        assertEquals(1, response.financialYearStartMonth());
        ArgumentCaptor<BusinessLocation> locationCaptor = ArgumentCaptor.forClass(BusinessLocation.class);
        verify(locations, times(2)).save(locationCaptor.capture());
        assertEquals(List.of("HQ", "STORE-1"), locationCaptor.getAllValues().stream()
                .map(BusinessLocation::getLocationCode).toList());
        verify(taxes, times(2)).save(any(BusinessTaxRegistration.class));
        verify(departments, times(2)).save(any(Department.class));
    }

    @Test
    void updatingLegacyAddressReusesTheRegisteredLocation() {
        Business business = new Business();
        business.setId(17L);
        owner.setBusiness(business);
        owner.setBusinessRole(BusinessRole.OWNER);
        BusinessLocation registered = new BusinessLocation();
        registered.setId(45L);
        registered.setBusiness(business);
        registered.setRegisteredAddress(true);
        registered.setLocationCode("HQ");
        when(businesses.findForUpdateById(17L)).thenReturn(Optional.of(business));
        when(locations.findRegisteredLocations(17L)).thenReturn(List.of(registered));
        BusinessRequest request = new BusinessRequest();
        request.setCity("Chennai");

        service.updateBusiness("firebase-owner", 17L, request);

        assertEquals("Chennai", registered.getCity());
        assertEquals("HQ", registered.getLocationCode());
        verify(locations, times(1)).save(registered);
    }

    @Test
    void rejectsUpdatesToAChildOwnedByAnotherBusiness() {
        Business current = new Business();
        current.setId(17L);
        Business other = new Business();
        other.setId(18L);
        owner.setBusiness(current);
        owner.setBusinessRole(BusinessRole.OWNER);
        when(businesses.findForUpdateById(17L)).thenReturn(Optional.of(current));
        BusinessLocation foreign = new BusinessLocation();
        foreign.setId(9L);
        foreign.setBusiness(other);
        when(locations.findById(9L)).thenReturn(Optional.of(foreign));
        BusinessRequest request = new BusinessRequest();
        request.setLocations(List.of(new BusinessLocationRequest(9L, "HQ", null,
                LocationType.REGISTERED_OFFICE, null, null, null, null, null, null, null, null)));

        assertThrows(BusinessAccessDeniedException.class,
                () -> service.updateBusiness("firebase-owner", 17L, request));
        verify(locations, never()).save(any(BusinessLocation.class));
    }
}
