package com.sohosuite.backend.config;

import com.sohosuite.backend.security.FirebaseBearerTokenFilter;
import com.sohosuite.backend.security.FirebaseTokenVerifier;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import tools.jackson.databind.json.JsonMapper;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:4173}") String configuredOrigins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(configuredOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE));
        cors.setExposedHeaders(List.of(HttpHeaders.WWW_AUTHENTICATE));
        cors.setAllowCredentials(false);
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    @Bean
    SecurityFilterChain apiSecurityFilterChain(HttpSecurity http, FirebaseTokenVerifier verifier,
            JsonMapper jsonMapper, CorsConfigurationSource corsConfigurationSource) throws Exception {
        FirebaseBearerTokenFilter firebaseFilter = new FirebaseBearerTokenFilter(verifier);
        AuthenticationEntryPoint unauthorized = (request, response, exception) ->
                writeFailure(response, jsonMapper, HttpServletResponse.SC_UNAUTHORIZED,
                        "UNAUTHORIZED", "A valid Firebase ID token is required");
        AccessDeniedHandler forbidden = (request, response, exception) ->
                writeFailure(response, jsonMapper, HttpServletResponse.SC_FORBIDDEN,
                        "FORBIDDEN", "Access is denied");

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(request -> "OPTIONS".equals(request.getMethod())).permitAll()
                        .anyRequest().authenticated())
                .addFilterAfter(firebaseFilter, SecurityContextHolderFilter.class);
        return http.build();
    }

    private static void writeFailure(HttpServletResponse response, JsonMapper mapper, int status,
            String code, String message) throws java.io.IOException {
        response.setStatus(status);
        if (status == 401) response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), Map.of("code", code, "message", message));
    }
}
