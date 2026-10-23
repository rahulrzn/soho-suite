package com.sohosuite.backend.user;

import java.util.Optional;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.exception.GlobalExceptionHandler;
import com.sohosuite.backend.exception.EmailAlreadyExistsException;
import com.sohosuite.backend.exception.UsernameAlreadyExistsException;
import com.sohosuite.backend.security.FirebaseBearerTokenFilter;
import com.sohosuite.backend.security.FirebaseTokenVerifier;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.controller.UserController;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import com.sohosuite.backend.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserProfileTests {

    private static final String PROFILE = """
            {"username":"Asha_01","firstName":"Asha","lastName":"Shah"}
            """;
    private UserRepository repository;
    private FirebaseAuth auth;
    private UserService service;
    private MockMvc mvc;

    @BeforeEach
    void setUp() throws Exception {
        repository = mock(UserRepository.class);
        auth = mock(FirebaseAuth.class);
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("verified-uid");
        when(token.getEmail()).thenReturn("asha@example.com");
        when(token.isEmailVerified()).thenReturn(true);
        when(auth.verifyIdToken("valid-token", true)).thenReturn(token);
        service = new UserService(repository);
        mvc = MockMvcBuilders.standaloneSetup(new UserController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .addFilters(new FirebaseBearerTokenFilter(new FirebaseTokenVerifier(auth)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        when(repository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void profileCreationRequiresVerifiedEmail(boolean emailVerified) throws Exception {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("verified-uid");
        when(token.getEmail()).thenReturn("asha@example.com");
        when(token.isEmailVerified()).thenReturn(emailVerified);
        when(auth.verifyIdToken("valid-token", true)).thenReturn(token);

        var result = mvc.perform(post("/api/users/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content(PROFILE));
        if (!emailVerified) {
            result.andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_REQUIRED"));
            verify(repository, never()).saveAndFlush(any());
            return;
        }
        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.firebaseUid").value("verified-uid"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.username").value("asha_01"))
                .andExpect(jsonPath("$.phone").isEmpty())
                .andExpect(jsonPath("$.business").isEmpty())
                .andExpect(jsonPath("$.phoneNumber").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
        verify(auth).verifyIdToken("valid-token", true);
    }

    @Test
    void rejectsMissingOrMalformedAuthorizationBeforeRepositoryAccess() throws Exception {
        mvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(post("/api/users/profile").contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/users/me/profile").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users/check-username").param("username", "asha_01"))
                .andExpect(status().isUnauthorized());
        for (String header : new String[] {"Basic value", "Bearer ", "Bearer two tokens"}) {
            mvc.perform(get("/api/users/me").header("Authorization", header))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("WWW-Authenticate", "Bearer"));
        }
        verifyNoInteractions(repository);
        verify(auth, never()).verifyIdToken(anyString(), anyBoolean());
    }

    @Test
    void rejectsFirebaseVerificationFailuresWithoutExposingDetails() throws Exception {
        when(auth.verifyIdToken("bad-token", true)).thenThrow(mock(FirebaseAuthException.class));
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("""
                        {"code":"UNAUTHORIZED","message":"A valid Firebase ID token is required"}
                        """));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired-token", "revoked-token"})
    void rejectsExpiredAndRevokedTokensUsingFirebaseRevocationCheck(String token) throws Exception {
        when(auth.verifyIdToken(token, true)).thenThrow(mock(FirebaseAuthException.class));

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        verify(auth).verifyIdToken(token, true);
        verifyNoInteractions(repository);
    }

    @Test
    void sameUidFromTwoProviderTokensReturnsSameLocalProfile() throws Exception {
        User existing = existingUser();
        when(repository.findByFirebaseUid("verified-uid")).thenReturn(Optional.of(existing));
        FirebaseToken googleToken = mock(FirebaseToken.class);
        when(googleToken.getUid()).thenReturn("verified-uid");
        when(googleToken.getEmail()).thenReturn("asha@example.com");
        when(googleToken.isEmailVerified()).thenReturn(true);
        when(auth.verifyIdToken("google-token", true)).thenReturn(googleToken);

        for (String token : new String[] {"valid-token", "google-token"}) {
            mvc.perform(post("/api/users/profile").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        }
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void partialPatchUsesVerifiedUidAndPreservesIdentity() throws Exception {
        User existing = existingUser();
        when(repository.findByFirebaseUid("verified-uid")).thenReturn(Optional.of(existing));
        mvc.perform(patch("/api/users/me/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"Anita\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("Anita"))
                .andExpect(jsonPath("$.lastName").value("Shah"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.username").value("asha_01"));
        verify(repository, never()).findById(anyLong());
    }

    @Test
    void profileResponseMapsBusinessToResponseDto() throws Exception {
        User existing = existingUser();
        Business business = new Business();
        business.setId(42L);
        business.setBusinessCode("BIZ-00000042");
        business.setCompanyName("Asha Trading");
        business.setTradingName("Asha Trading");
        existing.setBusiness(business);
        existing.setBusinessRole(BusinessRole.OWNER);
        when(repository.findByFirebaseUid("verified-uid")).thenReturn(Optional.of(existing));

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.business.id").value(42))
                .andExpect(jsonPath("$.business.company").value("Asha Trading"))
                .andExpect(jsonPath("$.business.tradingName").value("Asha Trading"))
                .andExpect(jsonPath("$.business.locations").isArray())
                .andExpect(jsonPath("$.businessRole").value("OWNER"))
                .andExpect(jsonPath("$.business.userList").doesNotExist());
    }

    @Test
    void missingLocalProfileRequiresCompletion() throws Exception {
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void unverifiedIdentityCanOnlyUseVerificationSupportLookupAndUnknownRoutesStayProtected() throws Exception {
        FirebaseToken unverified = mock(FirebaseToken.class);
        when(unverified.getUid()).thenReturn("verified-uid");
        when(unverified.getEmail()).thenReturn("asha@example.com");
        when(unverified.isEmailVerified()).thenReturn(false);
        when(auth.verifyIdToken("unverified-token", true)).thenReturn(unverified);
        when(repository.existsByUsername("asha_02")).thenReturn(false);

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer unverified-token"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
        mvc.perform(get("/api/users/check-username").header("Authorization", "Bearer unverified-token")
                        .param("username", "asha_02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(true));
        mvc.perform(patch("/api/users/me/profile").header("Authorization", "Bearer unverified-token")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_REQUIRED"));
        mvc.perform(get("/api/unknown").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isNotFound());
    }

    @Test
    void clientIdentityFieldsCannotOverrideVerifiedIdentity() throws Exception {
        mvc.perform(post("/api/users/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"username":"asha_01","firstName":"Asha","lastName":"Shah",
                                 "firebaseUid":"attacker-uid","email":"attacker@example.com",
                                 "id":999,"business":{"id":42}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firebaseUid").value("verified-uid"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.id").isEmpty())
                .andExpect(jsonPath("$.business").isEmpty());
    }

    @Test
    void patchCannotModifyProtectedFields() throws Exception {
        User existing = existingUser();
        when(repository.findByFirebaseUid("verified-uid")).thenReturn(Optional.of(existing));
        mvc.perform(patch("/api/users/me/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"firstName":"Anita","username":"attacker","firebaseUid":"attacker-uid",
                                 "email":"attacker@example.com","id":999,"business":{"id":42}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("asha_01"))
                .andExpect(jsonPath("$.firebaseUid").value("verified-uid"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.business").isEmpty());
    }

    @Test
    void validatesCreatePatchAndUsernameQuery() throws Exception {
        mvc.perform(post("/api/users/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"bad name\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(patch("/api/users/me/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"phone\":\" \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.phone").exists());
        mvc.perform(get("/api/users/check-username").header("Authorization", "Bearer valid-token")
                        .param("username", "bad name"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.username").exists());
        mvc.perform(get("/api/users/check-username").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.username").exists());
        verifyNoInteractions(repository);
    }

    @Test
    void usernameAvailabilityIsCaseInsensitive() throws Exception {
        when(repository.existsByUsername("asha_01")).thenReturn(true);
        mvc.perform(get("/api/users/check-username").header("Authorization", "Bearer valid-token")
                        .param("username", "ASHA_01"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void duplicateUsernameAndEmailReturnSeparateConflicts() throws Exception {
        when(repository.existsByUsername("asha_01")).thenReturn(true);
        mvc.perform(post("/api/users/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USERNAME_ALREADY_EXISTS"));
        when(repository.existsByUsername("asha_01")).thenReturn(false);
        when(repository.existsByEmailIgnoreCase("asha@example.com")).thenReturn(true);
        mvc.perform(post("/api/users/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void simultaneousCreationOfSameUidReturnsWinningProfile() {
        User winner = existingUser();
        when(repository.findByFirebaseUid("verified-uid"))
                .thenReturn(Optional.empty()).thenReturn(Optional.of(winner));
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("unique constraint"));
        assertEquals(winner.getId(), service.createProfile(identity(), profile()).id());
    }

    @Test
    void simultaneousUsernameOrEmailConflictUsesDomainException() {
        when(repository.existsByUsername("asha_01")).thenReturn(false, true);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("unique constraint"));
        assertThrows(UsernameAlreadyExistsException.class, () -> service.createProfile(identity(), profile()));
        when(repository.existsByUsername("asha_01")).thenReturn(false);
        when(repository.existsByEmailIgnoreCase("asha@example.com")).thenReturn(false, true);
        assertThrows(EmailAlreadyExistsException.class, () -> service.createProfile(identity(), profile()));
    }

    @Test
    void removedArbitraryIdAndListRoutesAreNotExposed() throws Exception {
        mvc.perform(get("/api/users").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/users/1").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/users/1/profile").header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
    }

    private User existingUser() {
        User user = new User();
        user.setId(1L);
        user.setFirebaseUid("verified-uid");
        user.setUsername("asha_01");
        user.setEmail("asha@example.com");
        user.setFirstName("Asha");
        user.setLastName("Shah");
        return user;
    }

    private VerifiedFirebaseIdentity identity() {
        return new VerifiedFirebaseIdentity("verified-uid", "asha@example.com", false);
    }

    private CreateUserProfileRequest profile() {
        CreateUserProfileRequest request = new CreateUserProfileRequest();
        request.setUsername("Asha_01");
        request.setFirstName("Asha");
        request.setLastName("Shah");
        return request;
    }
}
