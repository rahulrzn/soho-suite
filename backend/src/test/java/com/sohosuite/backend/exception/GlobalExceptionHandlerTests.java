package com.sohosuite.backend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.sohosuite.backend.analytics.controller.AnalyticsController;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.analytics.service.BusinessHealthScoreService;
import com.sohosuite.backend.inventory.controller.InventoryController;
import com.sohosuite.backend.inventory.service.InventoryService;
import com.sohosuite.backend.expense.controller.ExpenseController;
import com.sohosuite.backend.expense.service.ExpenseService;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

class GlobalExceptionHandlerTests {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void missingIdempotencyHeaderIsAClientValidationError() {
        var response = handler.handleMissingHeader(
                new MissingRequestHeaderException("Idempotency-Key", parameter()));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("VALIDATION_ERROR", response.getBody().get("code"));
    }

    @Test
    void missingUploadPartIsAClientValidationError() {
        var response = handler.handleMissingPart(new MissingServletRequestPartException("file"));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("VALIDATION_ERROR", response.getBody().get("code"));
    }

    @Test
    void uploadSizeLimitUsesHttp413() {
        var response = handler.handleUploadTooLarge(new MaxUploadSizeExceededException(5_242_880));

        assertEquals(413, response.getStatusCode().value());
        assertEquals("FILE_TOO_LARGE", response.getBody().get("code"));
    }

    @Test
    void exportSizeLimitUsesStableHttp413Contract() {
        var response = handler.handleExportTooLarge(new com.sohosuite.backend.exception.ExportTooLargeException());
        assertEquals(413, response.getStatusCode().value());
        assertEquals("EXPORT_TOO_LARGE", response.getBody().get("code"));
    }

    @Test
    void malformedAnalyticsDatesReturnSanitized400WithoutCallingService() throws Exception {
        AnalyticsService service = mock(AnalyticsService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new AnalyticsController(service, mock(BusinessHealthScoreService.class)))
                .setControllerAdvice(handler).build();

        mvc.perform(get("/api/businesses/1/analytics/overview").param("from", "not-a-date").param("to", "2026-01-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid request parameter"));
        verifyNoInteractions(service);
    }

    @Test
    void malformedAnalyticsToDateReturns400WithoutCallingService() throws Exception {
        AnalyticsService service = mock(AnalyticsService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new AnalyticsController(service, mock(BusinessHealthScoreService.class)))
                .setControllerAdvice(handler).build();
        mvc.perform(get("/api/businesses/1/analytics/overview").param("from", "2026-01-01").param("to", "2026-99-99"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(service);
    }

    @Test
    void unsupportedMediaTypeIsSanitized415() throws Exception {
        AnalyticsService service = mock(AnalyticsService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new AnalyticsController(service, mock(BusinessHealthScoreService.class)))
                .setControllerAdvice(handler).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                "/api/businesses/1/analytics/dataset-config").contentType(MediaType.TEXT_PLAIN).content("secret"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"))
                .andExpect(jsonPath("$.message").value("Content type is not supported"));
    }

    @Test
    void invalidNumericAndEnumParametersReturnSanitized400() throws Exception {
        InventoryService inventory = mock(InventoryService.class);
        ExpenseService expenses = mock(ExpenseService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new InventoryController(inventory), new ExpenseController(expenses))
                .setControllerAdvice(handler).build();

        mvc.perform(get("/api/businesses/1/inventory/items").param("page", "not-a-number"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/businesses/1/expenses").param("category", "SECRET_CATEGORY"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(inventory, expenses);
    }

    @Test
    void malformedJsonAndBeanValidationAreClientErrors() throws Exception {
        InventoryService inventory = mock(InventoryService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new InventoryController(inventory))
                .setControllerAdvice(handler).build();

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api/businesses/1/inventory/items").contentType(MediaType.APPLICATION_JSON).content("{\"name\":"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api/businesses/1/inventory/items").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \",\"openingQuantity\":-1}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(inventory);
    }

    @Test
    void unexpectedErrorsDoNotExposeExceptionDetails() {
        var response = handler.handleUnexpectedException(new IllegalStateException("token=secret uploaded-row=value"));
        assertEquals(500, response.getStatusCode().value());
        assertEquals("An unexpected error occurred", response.getBody().get("message"));
    }

    private static MethodParameter parameter() {
        try {
            return new MethodParameter(GlobalExceptionHandlerTests.class
                    .getDeclaredMethod("endpoint", String.class), 0);
        } catch (NoSuchMethodException exception) {
            throw new AssertionError(exception);
        }
    }

    private void endpoint(String header) { }
}
