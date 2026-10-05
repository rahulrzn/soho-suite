package com.sohosuite.backend.config;

import java.io.IOException;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class FirebaseConfig {

    @Bean(destroyMethod = "delete")
    public FirebaseApp firebaseApp(@Value("${FIREBASE_PROJECT_ID:}") String projectId) {
        if (!StringUtils.hasText(projectId)) {
            throw new IllegalStateException("Set FIREBASE_PROJECT_ID before starting the backend");
        }

        GoogleCredentials credentials;
        try {
            credentials = GoogleCredentials.getApplicationDefault();
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Firebase credentials unavailable. Configure GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials");
        }

        synchronized (FirebaseApp.class) {
            for (FirebaseApp app : FirebaseApp.getApps()) {
                if (app.getName().equals("soho-suite")) {
                    if (!projectId.equals(app.getOptions().getProjectId())) {
                        throw new IllegalStateException("Firebase project configuration does not match the existing app");
                    }
                    return app;
                }
            }
            return FirebaseApp.initializeApp(FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .setProjectId(projectId)
                    .build(), "soho-suite");
        }
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
