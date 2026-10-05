package com.sohosuite.backend.config;

import com.sohosuite.backend.security.FirebaseAuthenticationInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UserWebConfig implements WebMvcConfigurer {

    private final FirebaseAuthenticationInterceptor interceptor;

    public UserWebConfig(FirebaseAuthenticationInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/api/users", "/api/users/**");
    }
}
