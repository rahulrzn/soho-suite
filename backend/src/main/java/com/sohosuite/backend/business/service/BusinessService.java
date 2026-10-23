package com.sohosuite.backend.business.service;

import java.util.Currency;
import java.util.List;
import java.util.Locale;

import com.sohosuite.backend.business.dto.*;
import com.sohosuite.backend.business.entity.*;
import com.sohosuite.backend.business.enums.*;
import com.sohosuite.backend.business.repository.*;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.BusinessConflictException;
import com.sohosuite.backend.exception.BusinessNotFoundException;
import com.sohosuite.backend.exception.BusinessRequestException;
import com.sohosuite.backend.exception.MembershipConflictException;
import com.sohosuite.backend.exception.UserNotFoundException;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;

@Service
@Transactional
public class BusinessService {

    private static final String LEGACY_LOCATION_NAME = "Registered address";

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final BusinessLocationRepository locationRepository;
    private final BusinessTaxRegistrationRepository taxRepository;
    private final DepartmentRepository departmentRepository;

    public BusinessService(BusinessRepository businessRepository, UserRepository userRepository,
            BusinessLocationRepository locationRepository, BusinessTaxRegistrationRepository taxRepository,
            DepartmentRepository departmentRepository) {
        this.businessRepository = businessRepository;
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.taxRepository = taxRepository;
        this.departmentRepository = departmentRepository;
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessResponse createBusiness(String firebaseUid, BusinessRequest request) {
        User creator = userRepository.findForUpdateByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new UserNotFoundException("Complete your user profile first"));
        if (creator.getBusiness() != null) {
            throw new MembershipConflictException("User already belongs to a business");
        }

        Business business = new Business();
        applyBusinessFields(business, request, true);
        business.setBusinessCode(formatBusinessCode(businessRepository.nextBusinessCodeSequenceValue()));
        Business saved = businessRepository.saveAndFlush(business);
        creator.setBusiness(saved);
        creator.setBusinessRole(BusinessRole.OWNER);
        userRepository.save(creator);

        applyRelatedRecords(saved, request);
        syncLegacyAddress(saved, request, true);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public List<BusinessResponse> getCurrentUserBusinesses(String firebaseUid) {
        User user = getCurrentUser(firebaseUid);
        if (user.getBusiness() == null || user.getBusinessRole() == null) return List.of();
        return List.of(toResponse(user.getBusiness()));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessResponse getBusinessById(String firebaseUid, Long businessId) {
        requireMember(firebaseUid, businessId);
        return toResponse(businessRepository.findById(businessId)
                .orElseThrow(() -> new BusinessNotFoundException("Business not found")));
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void deleteBusiness(String firebaseUid, Long businessId) {
        Business business = lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        List<User> members = userRepository.findAllByBusinessId(businessId);
        for (User member : members) {
            member.setBusiness(null);
            member.setBusinessRole(null);
        }
        userRepository.saveAll(members);
        userRepository.flush();
        businessRepository.delete(business);
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessResponse updateBusiness(String firebaseUid, Long businessId, BusinessRequest request) {
        Business business = lockBusiness(businessId);
        User actor = requireMember(firebaseUid, businessId);
        if (actor.getBusinessRole() == BusinessRole.VIEWER) throw new BusinessAccessDeniedException();

        applyBusinessFields(business, request, false);
        Business saved = businessRepository.saveAndFlush(business);
        applyRelatedRecords(saved, request);
        syncLegacyAddress(saved, request, false);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public List<BusinessMemberResponse> getMembers(String firebaseUid, Long businessId) {
        requireMember(firebaseUid, businessId);
        return userRepository.findAllByBusinessId(businessId).stream().map(BusinessMemberResponse::from).toList();
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessMemberResponse addMember(String firebaseUid, Long businessId, AddBusinessMemberRequest request) {
        Business business = lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        requireAssignableRole(request.role());
        User member = lockUser(request.userId());
        if (member.getBusiness() != null) throw new MembershipConflictException("User already belongs to a business");
        member.setBusiness(business);
        member.setBusinessRole(request.role());
        return BusinessMemberResponse.from(userRepository.save(member));
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessMemberResponse updateMemberRole(String firebaseUid, Long businessId, Long userId,
            UpdateBusinessMemberRoleRequest request) {
        lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        requireAssignableRole(request.role());
        User member = requireTargetMember(businessId, userId);
        requireNotOwner(member);
        member.setBusinessRole(request.role());
        return BusinessMemberResponse.from(userRepository.save(member));
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void removeMember(String firebaseUid, Long businessId, Long userId) {
        lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        User member = requireTargetMember(businessId, userId);
        requireNotOwner(member);
        member.setBusiness(null);
        member.setBusinessRole(null);
        userRepository.save(member);
    }

    private void applyBusinessFields(Business business, BusinessRequest request, boolean creating) {
        String legacyCompany = clean(request.getCompanyName());
        String tradingName = clean(request.getTradingName());
        if (request.isCompanyNameProvided() || tradingName != null) {
            String effectiveTradingName = tradingName != null ? tradingName : legacyCompany;
            business.setTradingName(effectiveTradingName);
            business.setCompanyName(effectiveTradingName);
        } else if (creating) {
            business.setTradingName(null);
            business.setCompanyName(null);
        }

        if (request.getLegalBusinessName() != null) business.setLegalBusinessName(clean(request.getLegalBusinessName()));
        if (request.getBusinessType() != null) business.setBusinessType(request.getBusinessType());
        if (request.getIndustry() != null) business.setIndustry(clean(request.getIndustry()));
        if (request.getLegalStructure() != null) business.setLegalStructure(request.getLegalStructure());
        if (request.getBusinessEmail() != null) business.setBusinessEmail(clean(request.getBusinessEmail()));
        if (request.getBusinessCurrency() != null) {
            String code = request.getBusinessCurrency().trim().toUpperCase(Locale.ROOT);
            try {
                Currency.getInstance(code);
            } catch (IllegalArgumentException exception) {
                throw new BusinessRequestException("businessCurrency must be a recognized ISO 4217 code");
            }
            business.setBusinessCurrency(code);
        } else if (creating) {
            business.setBusinessCurrency("INR");
        }
        if (request.getFinancialYearStartMonth() != null) business.setFinancialYearStartMonth(request.getFinancialYearStartMonth());
        else if (creating) business.setFinancialYearStartMonth(4);
        if (request.getBusinessStatus() != null) business.setBusinessStatus(request.getBusinessStatus());
        else if (creating) business.setBusinessStatus(BusinessStatus.ACTIVE);

        if (creating || request.isCountryProvided()) business.setCountry(clean(request.getCountry()));
        if (creating || request.isStateProvided()) business.setState(clean(request.getState()));
        if (creating || request.isCityProvided()) business.setCity(clean(request.getCity()));
        if (creating || request.isPostalCodeProvided()) business.setPostalCode(clean(request.getPostalCode()));
        if (request.getDepartment() != null) business.setDepartment(clean(request.getDepartment()));
    }

    private void applyRelatedRecords(Business business, BusinessRequest request) {
        if (request.isLocationsProvided() && request.getLocations() != null) {
            for (BusinessLocationRequest input : request.getLocations()) upsertLocation(business, input);
        }
        if (request.isTaxRegistrationsProvided() && request.getTaxRegistrations() != null) {
            for (BusinessTaxRegistrationRequest input : request.getTaxRegistrations()) upsertTaxRegistration(business, input);
        }
        if (request.isDepartmentsProvided() && request.getDepartments() != null) {
            for (DepartmentRequest input : request.getDepartments()) upsertDepartment(business, input);
        }
    }

    private void upsertLocation(Business business, BusinessLocationRequest input) {
        BusinessLocation row = input.id() == null ? new BusinessLocation() : locationRepository.findById(input.id())
                .orElseThrow(() -> new BusinessNotFoundException("Business location not found"));
        requireSameBusiness(row.getBusiness(), business, "Business location");
        String code = input.locationCode().trim().toUpperCase(Locale.ROOT);
        if (locationRepository.codeExists(business.getId(), code, row.getId())) {
            throw new BusinessConflictException("Location code already exists for this business");
        }
        if (Boolean.TRUE.equals(input.isRegisteredAddress())) {
            locationRepository.findRegisteredLocations(business.getId()).stream()
                    .filter(existing -> !existing.getId().equals(row.getId()))
                    .forEach(existing -> { existing.setRegisteredAddress(false); locationRepository.save(existing); });
        }
        row.setBusiness(business);
        row.setLocationCode(code);
        row.setLocationName(clean(input.locationName()));
        row.setLocationType(input.locationType());
        row.setAddressLine1(clean(input.addressLine1()));
        row.setAddressLine2(clean(input.addressLine2()));
        row.setCity(clean(input.city()));
        row.setState(clean(input.state()));
        row.setPostalCode(clean(input.postalCode()));
        row.setCountry(clean(input.country()));
        if (input.isRegisteredAddress() != null) row.setRegisteredAddress(input.isRegisteredAddress());
        if (input.isActive() != null) row.setActive(input.isActive());
        locationRepository.save(row);
    }

    private void upsertTaxRegistration(Business business, BusinessTaxRegistrationRequest input) {
        BusinessTaxRegistration row = input.id() == null ? new BusinessTaxRegistration() : taxRepository.findById(input.id())
                .orElseThrow(() -> new BusinessNotFoundException("Tax registration not found"));
        requireSameBusiness(row.getBusiness(), business, "Tax registration");
        String type = input.registrationType().trim().toUpperCase(Locale.ROOT);
        String jurisdiction = input.jurisdiction().trim().toUpperCase(Locale.ROOT);
        String number = input.registrationNumber().trim();
        if (taxRepository.registrationExists(business.getId(), type, jurisdiction, number, row.getId())) {
            throw new BusinessConflictException("This tax registration already exists for the business and jurisdiction");
        }
        row.setBusiness(business);
        row.setRegistrationType(type);
        row.setRegistrationNumber(number);
        row.setJurisdiction(jurisdiction);
        if (input.status() != null) row.setStatus(input.status());
        else if (row.getId() == null) row.setStatus(TaxRegistrationStatus.ACTIVE);
        taxRepository.save(row);
    }

    private void upsertDepartment(Business business, DepartmentRequest input) {
        Department row = input.id() == null ? new Department() : departmentRepository.findById(input.id())
                .orElseThrow(() -> new BusinessNotFoundException("Department not found"));
        requireSameBusiness(row.getBusiness(), business, "Department");
        String code = input.departmentCode().trim().toUpperCase(Locale.ROOT);
        if (departmentRepository.codeExists(business.getId(), code, row.getId())) {
            throw new BusinessConflictException("Department code already exists for this business");
        }
        row.setBusiness(business);
        row.setDepartmentCode(code);
        row.setDepartmentName(input.departmentName().trim());
        if (input.isActive() != null) row.setActive(input.isActive());
        departmentRepository.save(row);
    }

    private void syncLegacyAddress(Business business, BusinessRequest request, boolean creating) {
        boolean addressWasSupplied = creating
                ? anyValue(business.getCountry(), business.getState(), business.getCity(), business.getPostalCode())
                : request.isCountryProvided() || request.isStateProvided() || request.isCityProvided() || request.isPostalCodeProvided();
        if (!addressWasSupplied) return;

        List<BusinessLocation> registered = locationRepository.findRegisteredLocations(business.getId());
        BusinessLocation row = registered.isEmpty() ? new BusinessLocation() : registered.getFirst();
        if (row.getId() == null) {
            row.setBusiness(business);
            row.setLocationCode("LEGACY-" + business.getId());
            row.setLocationName(LEGACY_LOCATION_NAME);
            row.setLocationType(LocationType.REGISTERED_OFFICE);
            row.setRegisteredAddress(true);
            row.setActive(true);
        }
        row.setCountry(business.getCountry());
        row.setState(business.getState());
        row.setCity(business.getCity());
        row.setPostalCode(business.getPostalCode());
        locationRepository.save(row);
    }

    private BusinessResponse toResponse(Business business) {
        Long id = business.getId();
        return BusinessResponse.from(business,
                locationRepository.findAllForBusiness(id).stream().map(BusinessLocationResponse::from).toList(),
                taxRepository.findAllForBusiness(id).stream().map(BusinessTaxRegistrationResponse::from).toList(),
                departmentRepository.findAllForBusiness(id).stream().map(DepartmentResponse::from).toList());
    }

    private void requireSameBusiness(Business childBusiness, Business business, String childName) {
        if (childBusiness != null && !business.getId().equals(childBusiness.getId())) {
            throw new BusinessAccessDeniedException();
        }
    }

    private String formatBusinessCode(long value) {
        return String.format(Locale.ROOT, "BIZ-%08d", value);
    }

    private boolean anyValue(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return true;
        return false;
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User getCurrentUser(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid).orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private User requireMember(String firebaseUid, Long businessId) {
        User user = getCurrentUser(firebaseUid);
        if (user.getBusiness() == null || !businessId.equals(user.getBusiness().getId()) || user.getBusinessRole() == null) {
            throw new BusinessAccessDeniedException();
        }
        return user;
    }

    private void requireOwner(String firebaseUid, Long businessId) {
        if (requireMember(firebaseUid, businessId).getBusinessRole() != BusinessRole.OWNER) throw new BusinessAccessDeniedException();
    }

    private Business lockBusiness(Long businessId) {
        return businessRepository.findForUpdateById(businessId).orElseThrow(() -> new BusinessNotFoundException("Business not found"));
    }

    private User lockUser(Long userId) {
        return userRepository.findForUpdateById(userId).orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private User requireTargetMember(Long businessId, Long userId) {
        User member = lockUser(userId);
        if (member.getBusiness() == null || !businessId.equals(member.getBusiness().getId())) {
            throw new UserNotFoundException("Business member not found");
        }
        return member;
    }

    private void requireAssignableRole(BusinessRole role) {
        if (role == null || role == BusinessRole.OWNER) {
            throw new MembershipConflictException("Only MANAGER or VIEWER can be assigned; ownership cannot be transferred here");
        }
    }

    private void requireNotOwner(User member) {
        if (member.getBusinessRole() == BusinessRole.OWNER) throw new MembershipConflictException("The owner cannot be removed or demoted");
    }
}
