package com.sohosuite.backend.business;

import java.util.Optional;

import com.sohosuite.backend.exception.GlobalExceptionHandler;
import com.sohosuite.backend.business.controller.BusinessController;
import com.sohosuite.backend.business.entity.*;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.*;
import com.sohosuite.backend.business.service.BusinessService;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.security.FirebaseTokenVerifier;
import com.sohosuite.backend.security.FirebaseBearerTokenFilter;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BusinessErrorHandlingTests {

    private static final String VALID_BODY = """
            {"company":"SOHO Supplies","businessEmail":"hello@example.com",
             "country":"India","state":"Karnataka","city":"Bengaluru",
             "pincode":"560001","department":"Sales"}
            """;

    private BusinessRepository repository;
    private BusinessLocationRepository locations;
    private BusinessTaxRegistrationRepository taxes;
    private DepartmentRepository departments;
    private MockMvc mvc;
    private UserRepository users;
    private User owner;

    @BeforeEach
    void setUp() {
        repository = mock(BusinessRepository.class);
        locations = mock(BusinessLocationRepository.class);
        taxes = mock(BusinessTaxRegistrationRepository.class);
        departments = mock(DepartmentRepository.class);
        users = mock(UserRepository.class);
        owner = new User();
        owner.setId(1L);
        owner.setBusinessRole(BusinessRole.OWNER);
        Business business = new Business();
        business.setId(1L);
        owner.setBusiness(business);
        when(users.findByFirebaseUid("owner")).thenReturn(Optional.of(owner));
        when(users.findForUpdateByFirebaseUid("owner")).thenReturn(Optional.of(owner));
        when(repository.findForUpdateById(1L)).thenReturn(Optional.of(business));
        when(users.findAllByBusinessId(1L)).thenReturn(java.util.List.of(owner));
        FirebaseTokenVerifier verifier = mock(FirebaseTokenVerifier.class);
        when(verifier.verify(any())).thenAnswer(invocation -> {
            if (!"Bearer valid-token".equals(invocation.getArgument(0))) {
                throw new InvalidFirebaseTokenException();
            }
            return new VerifiedFirebaseIdentity("owner", "owner@example.com", true);
        });
        when(repository.nextBusinessCodeSequenceValue()).thenReturn(1L);
        when(repository.saveAndFlush(any(Business.class))).thenAnswer(invocation -> {
            Business saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(1L);
            return saved;
        });
        mvc = MockMvcBuilders.standaloneSetup(new BusinessController(
                        new BusinessService(repository, users, locations, taxes, departments)))
                .defaultRequest(get("/").header("Authorization", "Bearer valid-token"))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .addFilters(new FirebaseBearerTokenFilter(verifier))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void invalidTokenAndViewerMutationsAreRejected() throws Exception {
        mvc.perform(get("/api/businesses").header("Authorization", "Basic invalid"))
                .andExpect(status().isUnauthorized());
        owner.setBusinessRole(BusinessRole.VIEWER);
        mvc.perform(put("/api/businesses/1").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(post("/api/businesses/1/members").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2,\"role\":\"VIEWER\"}"))
                .andExpect(status().isForbidden());
        verify(repository, never()).saveAndFlush(any());
        verify(users, never()).save(any());
    }

    @Test
    void membershipEndpointsValidateAndReturnLimitedMemberData() throws Exception {
        User target = new User();
        target.setId(2L);
        target.setUsername("member");
        target.setEmail("private@example.com");
        target.setFirebaseUid("private-uid");
        when(users.findForUpdateById(2L)).thenReturn(Optional.of(target));
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        mvc.perform(post("/api/businesses/1/members").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2,\"role\":\"VIEWER\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("VIEWER"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.firebaseUid").doesNotExist());
        mvc.perform(patch("/api/businesses/1/members/2/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"MANAGER\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MANAGER"));
        mvc.perform(post("/api/businesses/1/members").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/businesses/1/members/2/role").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"INVALID\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/businesses/1/members/2")).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertNull(target.getBusiness());
    }

    @Test
    void missingBusinessReturnsSameErrorForGetPutAndDelete() throws Exception {
        when(repository.findById(999L)).thenReturn(Optional.empty());
        owner.getBusiness().setId(999L);

        for (var request : new org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder[] {
                get("/api/businesses/999"),
                put("/api/businesses/999").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY),
                delete("/api/businesses/999")}) {
            mvc.perform(request)
                    .andExpect(status().isNotFound())
                    .andExpect(content().json("""
                            {"code":"BUSINESS_NOT_FOUND","message":"Business not found"}
                            """));
        }
        verify(repository, never()).save(any());
        verify(repository, never()).delete(any(Business.class));
    }

    @Test
    void invalidPostAndPutReturnFieldErrorsBeforeCallingRepository() throws Exception {
        String invalidBody = """
                {"company":"Legacy name","tradingName":"Different name","businessEmail":"invalid","businessCurrency":"inr"}
                """;
        for (var request : new org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder[] {
                post("/api/businesses"), put("/api/businesses/1")}) {
            mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(invalidBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.errors.businessEmail").value("Enter a valid Business Email"))
                    .andExpect(jsonPath("$.errors.legacyCompanyConsistent").exists())
                    .andExpect(jsonPath("$.errors.businessCurrency").exists());
        }
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsBusinessFieldsLongerThanTheirDatabaseColumns() throws Exception {
        String tooLong = "x".repeat(256);
        String[] invalidBodies = {
                "{\"company\":\"%s\"}".formatted(tooLong),
                "{\"legalBusinessName\":\"%s\"}".formatted(tooLong),
                "{\"tradingName\":\"%s\"}".formatted(tooLong),
                "{\"businessEmail\":\"%s@example.com\"}".formatted("x".repeat(245)),
                "{\"country\":\"%s\"}".formatted(tooLong),
                "{\"state\":\"%s\"}".formatted(tooLong),
                "{\"city\":\"%s\"}".formatted(tooLong),
                "{\"pincode\":\"%s\"}".formatted(tooLong),
                "{\"department\":\"%s\"}".formatted(tooLong)
        };
        String[] errorFields = {
                "company", "legalBusinessName", "tradingName", "businessEmail",
                "country", "state", "city", "pincode", "department"
        };

        for (int i = 0; i < invalidBodies.length; i++) {
            mvc.perform(post("/api/businesses").contentType(MediaType.APPLICATION_JSON).content(invalidBodies[i]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.errors." + errorFields[i]).exists());
        }
        verifyNoInteractions(repository);
    }

    @Test
    void acceptsBusinessFieldAtDatabaseColumnLength() throws Exception {
        String boundaryCompany = "x".repeat(255);
        owner.setBusiness(null);

        mvc.perform(post("/api/businesses").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"company\":\"%s\"}".formatted(boundaryCompany)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value(boundaryCompany));
    }

    @Test
    void validCrudRequestsKeepTheirSuccessResponses() throws Exception {
        Business business = new Business();
        business.setId(1L);
        business.setCompanyName("Original company");
        when(repository.findById(1L)).thenReturn(Optional.of(business));
        when(repository.findForUpdateById(1L)).thenReturn(Optional.of(business));
        owner.setBusiness(null);
        mvc.perform(post("/api/businesses").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.department").value("Sales"));
        // Creation associates the owner with the newly saved business.
        mvc.perform(get("/api/businesses/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("Original company"));
        mvc.perform(put("/api/businesses/1").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("SOHO Supplies"))
                .andExpect(jsonPath("$.department").value("Sales"));
        mvc.perform(delete("/api/businesses/1"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        verify(repository).delete(business);
    }

    @Test
    void unexpectedFailureDoesNotExposeInternalDetails() throws Exception {
        when(repository.findById(1L)).thenThrow(new IllegalStateException("private database details"));

        mvc.perform(get("/api/businesses/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private database details"))))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.aMapWithSize(2)))
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"));
    }
}
