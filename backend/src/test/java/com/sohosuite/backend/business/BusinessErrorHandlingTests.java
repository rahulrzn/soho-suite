package com.sohosuite.backend.business;

import java.util.Optional;

import com.sohosuite.backend.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
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
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        repository = mock(BusinessRepository.class);
        mvc = MockMvcBuilders.standaloneSetup(new BusinessController(new BusinessService(repository)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void missingBusinessReturnsSameErrorForGetPutAndDelete() throws Exception {
        when(repository.findById(999L)).thenReturn(Optional.empty());

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
                {"company":" ","businessEmail":"invalid","country":"","pincode":""}
                """;
        for (var request : new org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder[] {
                post("/api/businesses"), put("/api/businesses/1")}) {
            mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(invalidBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.errors.company").value("Company name is required"))
                    .andExpect(jsonPath("$.errors.businessEmail").value("Enter a valid Business Email"))
                    .andExpect(jsonPath("$.errors.country").value("Country is required"))
                    .andExpect(jsonPath("$.errors.pincode").value("Pin code is required"));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void validCrudRequestsKeepTheirSuccessResponses() throws Exception {
        Business business = new Business();
        business.setId(1L);
        business.setCompany("Original company");
        when(repository.findById(1L)).thenReturn(Optional.of(business));
        when(repository.save(any(Business.class))).thenAnswer(invocation -> {
            Business saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        mvc.perform(post("/api/businesses").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.department").value("Sales"));
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
