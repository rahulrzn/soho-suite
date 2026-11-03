package com.sohosuite.backend.business.service;

import java.util.Currency;
import java.util.List;
import java.util.Locale;

import com.sohosuite.backend.business.dto.*;
import com.sohosuite.backend.activity.service.BusinessActivityService;
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
    private final BusinessMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final BusinessLocationRepository locationRepository;
    private final BusinessTaxRegistrationRepository taxRepository;
    private final DepartmentRepository departmentRepository;
    private final BusinessActivityService activity;

    public BusinessService(BusinessRepository businessRepository, BusinessMembershipRepository membershipRepository,
            UserRepository userRepository,
            BusinessLocationRepository locationRepository, BusinessTaxRegistrationRepository taxRepository,
            DepartmentRepository departmentRepository, BusinessActivityService activity) {
        this.businessRepository = businessRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.taxRepository = taxRepository;
        this.departmentRepository = departmentRepository;
        this.activity = activity;
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessResponse createBusiness(String firebaseUid, BusinessRequest request) {
        User creator = userRepository.findForUpdateByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new UserNotFoundException("Complete your user profile first"));
        Business business = new Business();
        applyBusinessFields(business, request, true);
        business.setBusinessCode(formatBusinessCode(businessRepository.nextBusinessCodeSequenceValue()));
        Business saved = businessRepository.saveAndFlush(business);
        createMembership(creator, saved, BusinessRole.OWNER);
        if (creator.getBusiness() == null) setLegacyDefault(creator, saved, BusinessRole.OWNER);

        applyRelatedRecords(saved, request);
        syncLegacyAddress(saved, request, true);
        activity.record(saved.getId(), creator.getId(), "BUSINESS_CREATED", "BUSINESS", saved.getId().toString(), "Business created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public List<BusinessResponse> getCurrentUserBusinesses(String firebaseUid) {
        return membershipRepository.findAllForFirebaseUser(firebaseUid).stream()
                .map(membership -> toResponse(membership.getBusiness())).toList();
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
        BusinessMembership actor = membershipRepository.findForFirebaseUserAndBusiness(firebaseUid, businessId)
                .orElseThrow(BusinessAccessDeniedException::new);
        List<BusinessMembership> memberships = membershipRepository.findAllForBusiness(businessId);
        for (var membership : memberships) {
            User member = membership.getUser();
            if (member.getBusiness() != null && businessId.equals(member.getBusiness().getId())) {
                setLegacyDefaultFromRemainingMembership(member, businessId);
            }
        }
        membershipRepository.deleteAll(memberships);
        activity.record(businessId, actor.getUser().getId(), "BUSINESS_DELETED", "BUSINESS", businessId.toString(), "Business deleted");
        businessRepository.delete(business);
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessResponse updateBusiness(String firebaseUid, Long businessId, BusinessRequest request) {
        Business business = lockBusiness(businessId);
        var actor = requireMember(firebaseUid, businessId);
        if (actor.getRole() == BusinessRole.VIEWER) throw new BusinessAccessDeniedException();

        applyBusinessFields(business, request, false);
        Business saved = businessRepository.saveAndFlush(business);
        applyRelatedRecords(saved, request);
        syncLegacyAddress(saved, request, false);
        activity.record(businessId, actor.getUser().getId(), "BUSINESS_UPDATED", "BUSINESS", businessId.toString(), "Business details updated");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public List<BusinessMemberResponse> getMembers(String firebaseUid, Long businessId) {
        requireMember(firebaseUid, businessId);
        return membershipRepository.findAllForBusiness(businessId).stream()
                .map(BusinessMemberResponse::from).toList();
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessMemberResponse addMember(String firebaseUid, Long businessId, AddBusinessMemberRequest request) {
        Business business = lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        requireAssignableRole(request.role());
        User member = lockUser(request.userId());
        if (membershipRepository.existsByUser_IdAndBusiness_Id(member.getId(), businessId)) {
            throw new MembershipConflictException("User is already a member of this business");
        }
        var membership = createMembership(member, business, request.role());
        var actor = requireMember(firebaseUid, businessId);
        activity.record(businessId, actor.getUser().getId(), "MEMBER_ADDED", "MEMBERSHIP", member.getId().toString(), "Business member added");
        if (member.getBusiness() == null) setLegacyDefault(member, business, request.role());
        return BusinessMemberResponse.from(membership);
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessMemberResponse updateMemberRole(String firebaseUid, Long businessId, Long userId,
            UpdateBusinessMemberRoleRequest request) {
        lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        requireAssignableRole(request.role());
        var membership = requireTargetMembership(businessId, userId);
        requireNotOwner(membership);
        membership.setRole(request.role());
        var actor = requireMember(firebaseUid, businessId);
        activity.record(businessId, actor.getUser().getId(), "MEMBER_ROLE_UPDATED", "MEMBERSHIP", userId.toString(), "Business member role updated");
        if (membership.getUser().getBusiness() != null
                && businessId.equals(membership.getUser().getBusiness().getId())) {
            membership.getUser().setBusinessRole(request.role());
            userRepository.save(membership.getUser());
        }
        return BusinessMemberResponse.from(membershipRepository.save(membership));
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void removeMember(String firebaseUid, Long businessId, Long userId) {
        lockBusiness(businessId);
        requireOwner(firebaseUid, businessId);
        var membership = requireTargetMembership(businessId, userId);
        requireNotOwner(membership);
        User member = membership.getUser();
        var actor = requireMember(firebaseUid, businessId);
        activity.record(businessId, actor.getUser().getId(), "MEMBER_REMOVED", "MEMBERSHIP", userId.toString(), "Business member removed");
        membershipRepository.delete(membership);
        if (member.getBusiness() != null && businessId.equals(member.getBusiness().getId())) {
            setLegacyDefaultFromRemainingMembership(member, businessId);
        }
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

    private BusinessMembership requireMember(String firebaseUid, Long businessId) {
        return membershipRepository.findForFirebaseUserAndBusiness(firebaseUid, businessId)
                .orElseThrow(BusinessAccessDeniedException::new);
    }

    private void requireOwner(String firebaseUid, Long businessId) {
        if (requireMember(firebaseUid, businessId).getRole() != BusinessRole.OWNER) {
            throw new BusinessAccessDeniedException();
        }
    }

    private Business lockBusiness(Long businessId) {
        return businessRepository.findForUpdateById(businessId).orElseThrow(() -> new BusinessNotFoundException("Business not found"));
    }

    private User lockUser(Long userId) {
        return userRepository.findForUpdateById(userId).orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private BusinessMembership requireTargetMembership(Long businessId, Long userId) {
        return membershipRepository.findByUser_IdAndBusiness_Id(userId, businessId)
                .orElseThrow(() -> new UserNotFoundException("Business member not found"));
    }

    private void requireAssignableRole(BusinessRole role) {
        if (role == null || role == BusinessRole.OWNER) {
            throw new MembershipConflictException("Only MANAGER or VIEWER can be assigned; ownership cannot be transferred here");
        }
    }

    private void requireNotOwner(BusinessMembership membership) {
        if (membership.getRole() == BusinessRole.OWNER) {
            throw new MembershipConflictException("The owner cannot be removed or demoted");
        }
    }

    private BusinessMembership createMembership(User user, Business business, BusinessRole role) {
        BusinessMembership membership = new BusinessMembership();
        membership.setUser(user);
        membership.setBusiness(business);
        membership.setRole(role);
        return membershipRepository.save(membership);
    }

    /** Keep old profile clients pointed at one valid default; authorization never reads these columns. */
    private void setLegacyDefault(User user, Business business, BusinessRole role) {
        user.setBusiness(business);
        user.setBusinessRole(role);
        userRepository.save(user);
    }

    private void setLegacyDefaultFromRemainingMembership(User user, Long removedBusinessId) {
        membershipRepository.findAllByUser_IdOrderById(user.getId()).stream()
                .filter(membership -> !removedBusinessId.equals(membership.getBusiness().getId()))
                .findFirst()
                .ifPresentOrElse(
                        membership -> setLegacyDefault(user, membership.getBusiness(), membership.getRole()),
                        () -> {
                            user.setBusiness(null);
                            user.setBusinessRole(null);
                            userRepository.save(user);
                        });
    }
}
