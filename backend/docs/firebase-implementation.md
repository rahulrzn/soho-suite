# SOHO Suite Firebase authentication refactor

## A. Files deleted
None in this step. PasswordConfig, PasswordResetRequest, PasswordResetToken and BCrypt were already removed in the preceding refactor.

## B. Files created
- config/FirebaseConfig.java
- config/UserWebConfig.java
- security/FirebaseTokenVerifier.java
- security/FirebaseAuthenticationInterceptor.java
- security/VerifiedFirebaseIdentity.java
- user/dto/CreateUserProfileRequest.java
- exception/InvalidFirebaseTokenException.java
- exception/UsernameAlreadyExistsException.java
- docs/firebase-authentication.md, docs/firebase-development-schema.sql and this report

## C. Files modified
- user/User.java, UserRepository.java, UserService.java, UserController.java
- exception/GlobalExceptionHandler.java
- backend/pom.xml
- src/test/java/com/sohosuite/backend/user/UserProfileTests.java
UpdateProfileRequest.java is retained unchanged. Business source files were not edited in this step.

## D. Final User.java

```java
package com.sohosuite.backend.user;

import com.sohosuite.backend.business.Business;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Firebase UID is required")
    @Column(name = "firebase_uid", nullable = false, unique = true, updatable = false)
    private String firebaseUid;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be 3 to 30 characters")
    @Pattern(regexp = "[a-z0-9_]+", message = "Username may contain letters, digits and underscores only")
    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @Email(message = "Enter a valid email")
    @NotBlank(message = "Email is required")
    @Column(nullable = false, unique = true)
    private String email;

    private String phone;

    @ManyToOne
    @JoinColumn(name = "business_id")
    private Business business;
}
```

## E. Final UserRepository.java

```java
package com.sohosuite.backend.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByFirebaseUid(String firebaseUid);

    boolean existsByFirebaseUid(String firebaseUid);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}
```

## F. Final UserService.java

```java
package com.sohosuite.backend.user;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.sohosuite.backend.exception.EmailAlreadyExistsException;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import com.sohosuite.backend.exception.UserNotFoundException;
import com.sohosuite.backend.exception.UsernameAlreadyExistsException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateProfileRequest;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createProfile(VerifiedFirebaseIdentity identity, CreateUserProfileRequest request) {
        User existingUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
        if (existingUser != null) {
            return existingUser;
        }

        if (!StringUtils.hasText(identity.email())) {
            throw new InvalidFirebaseTokenException();
        }
        String username = request.getUsername().toLowerCase(Locale.ROOT);
        String email = identity.email().toLowerCase(Locale.ROOT);
        checkAvailability(username, email);

        User user = new User();
        user.setFirebaseUid(identity.uid());
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            // The repository transaction has rolled back; another request may have won the insert.
            User concurrentUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
            if (concurrentUser != null) {
                return concurrentUser;
            }
            checkAvailability(username, email);
            throw exception;
        }
    }

    public User getCurrentUser(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() ->
                        new UserNotFoundException("User not found"));
    }

    public User updateProfile(String firebaseUid, UpdateProfileRequest request) {
        User existingUser = getCurrentUser(firebaseUid);

        if (request.getFirstName() != null) {
            existingUser.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            existingUser.setLastName(request.getLastName());
        }

        if (request.getPhone() != null) {
            existingUser.setPhone(request.getPhone());
        }

        return userRepository.save(existingUser);
    }

    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username.toLowerCase(Locale.ROOT));
    }

    private void checkAvailability(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
    }
}
```

## G. Final UserController.java

```java
package com.sohosuite.backend.user;

import java.util.Map;

import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/profile")
    public User createProfile(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity,
            @Valid @RequestBody CreateUserProfileRequest request) {
        return userService.createProfile(identity, request);
    }

    @GetMapping("/me")
    public User getCurrentUser(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity) {
        return userService.getCurrentUser(identity.uid());
    }

    @PatchMapping("/me/profile")
    public User updateProfile(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity,
            @Valid @RequestBody UpdateProfileRequest request) {

        return userService.updateProfile(identity.uid(), request);
    }

    @GetMapping("/check-username")
    public Map<String, Boolean> checkUsername(
            @RequestParam("username")
            @Size(min = 3, max = 30, message = "Username must be 3 to 30 characters")
            @Pattern(regexp = "[a-zA-Z0-9_]+", message = "Username may contain letters, digits and underscores only")
            String username) {
        return Map.of("available", userService.isUsernameAvailable(username));
    }
}
```

## H. CreateUserProfileRequest.java

```java
package com.sohosuite.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserProfileRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be 3 to 30 characters")
    @Pattern(regexp = "[a-zA-Z0-9_]+", message = "Username may contain letters, digits and underscores only")
    private String username;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @Pattern(regexp = "(?s).*\\S.*", message = "Phone number must not be blank")
    private String phone;
}
```

## H. UpdateProfileRequest.java

```java
package com.sohosuite.backend.user.dto;

import jakarta.validation.constraints.Pattern;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @Pattern(regexp = "(?s).*\\S.*", message = "First name must not be blank")
    private String firstName;

    @Pattern(regexp = "(?s).*\\S.*", message = "Last name must not be blank")
    private String lastName;

    @Pattern(regexp = "(?s).*\\S.*", message = "Phone number must not be blank")
    private String phone;
}
```

## I. FirebaseConfig.java

```java
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
```

## I. UserWebConfig.java

```java
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
```

## I. FirebaseTokenVerifier.java

```java
package com.sohosuite.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class FirebaseTokenVerifier {

    private final FirebaseAuth firebaseAuth;

    public FirebaseTokenVerifier(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    public VerifiedFirebaseIdentity verify(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new InvalidFirebaseTokenException();
        }
        String token = authorization.substring(7).trim();
        if (token.isEmpty() || token.chars().anyMatch(Character::isWhitespace)) {
            throw new InvalidFirebaseTokenException();
        }

        try {
            FirebaseToken verified = firebaseAuth.verifyIdToken(token, true);
            if (!StringUtils.hasText(verified.getUid())) {
                throw new InvalidFirebaseTokenException();
            }
            return new VerifiedFirebaseIdentity(verified.getUid(), verified.getEmail());
        } catch (FirebaseAuthException | IllegalArgumentException exception) {
            // Never include the token or Firebase exception details in logs or responses.
            throw new InvalidFirebaseTokenException();
        }
    }
}
```

## I. FirebaseAuthenticationInterceptor.java

```java
package com.sohosuite.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class FirebaseAuthenticationInterceptor implements HandlerInterceptor {

    private final FirebaseTokenVerifier tokenVerifier;

    public FirebaseAuthenticationInterceptor(FirebaseTokenVerifier tokenVerifier) {
        this.tokenVerifier = tokenVerifier;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        VerifiedFirebaseIdentity identity = tokenVerifier.verify(request.getHeader(HttpHeaders.AUTHORIZATION));
        request.setAttribute("firebaseIdentity", identity);
        return true;
    }
}
```

## I. VerifiedFirebaseIdentity.java

```java
package com.sohosuite.backend.security;

public record VerifiedFirebaseIdentity(String uid, String email) {
}
```

## J. InvalidFirebaseTokenException.java

```java
package com.sohosuite.backend.exception;

public class InvalidFirebaseTokenException extends RuntimeException {

    public InvalidFirebaseTokenException() {
        super("A valid Firebase ID token is required");
    }
}
```

## J. UsernameAlreadyExistsException.java

```java
package com.sohosuite.backend.exception;

public class UsernameAlreadyExistsException extends RuntimeException {

    public UsernameAlreadyExistsException(String message) {
        super(message);
    }
}
```

## J. GlobalExceptionHandler.java

```java
package com.sohosuite.backend.exception;

import java.util.Map;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException exception) {

        Map<String, String> errors = new TreeMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));

        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR",
                "errors", errors));
    }

    @ExceptionHandler(BusinessNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleBusinessNotFound(
            BusinessNotFoundException exception) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "BUSINESS_NOT_FOUND",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserNotFound(
            UserNotFoundException exception) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "USER_NOT_FOUND",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleEmailAlreadyExists(
            EmailAlreadyExistsException exception) {

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "EMAIL_ALREADY_EXISTS",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleUsernameAlreadyExists(
            UsernameAlreadyExistsException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "USERNAME_ALREADY_EXISTS",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(InvalidFirebaseTokenException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(InvalidFirebaseTokenException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .body(Map.of("code", "UNAUTHORIZED", "message", exception.getMessage()));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleParameterValidation(HandlerMethodValidationException exception) {
        Map<String, String> errors = new TreeMap<>();
        exception.getParameterValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error -> errors.putIfAbsent(
                    name == null ? "request" : name,
                    error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()));
        });
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION_ERROR", "errors", errors));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of(exception.getParameterName(), "Value is required")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of("request", "Invalid JSON request")));
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<Map<String, String>> handleRouteNotFound(Exception exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "NOT_FOUND", "message", "Endpoint not found"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpectedException(Exception exception) {
        log.error("Unexpected error while processing request", exception);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "code", "INTERNAL_SERVER_ERROR",
                "message", "An unexpected error occurred"));
    }
}
```

## K. Maven dependency change
Only the Firebase Admin SDK was added. No Spring Security starter, BCrypt or other direct dependency was added.
```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.11.0</version>
</dependency>
```

## L–O. Database, environment, Postman plan and provider linking
The complete instructions follow. The manual SQL script is [firebase-development-schema.sql](firebase-development-schema.sql). No schema changes have been applied.

# Firebase authentication and local profiles

Firebase owns signup, login, credentials, email verification, password resets and provider linking.
Spring verifies ID tokens and stores application profiles in PostgreSQL. No roles or business linking are added.

## Configuration

Enable Email/Password and Google providers in the Firebase project's Authentication console.
Configure the frontend with that same project. Firebase Admin Java 9.11.0 is the only new direct dependency.

For local PowerShell startup, keep the service-account file OUTSIDE this repository:

```powershell
$env:FIREBASE_PROJECT_ID = 'your-firebase-project-id'
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secrets\soho-firebase-admin.json'
cd D:\Dev\programming\soho-suite\backend
.\mvnw.cmd spring-boot:run
```

The file must be a valid service-account credential for the configured project, with permission to read
Firebase Authentication users (revocation/disabled-user checks require this). On Google-hosted infrastructure,
Application Default Credentials may come from the attached service account instead of a JSON file.
Never commit credentials, send them to the frontend, or log ID tokens. Do not configure
FIREBASE_AUTH_EMULATOR_HOST against production; the Firebase emulator accepts unsigned emulator tokens.

FirebaseConfig fails startup when the project ID or available credentials are missing.
It manages one named FirebaseApp and deletes it when the Spring context closes.
No real Firebase credentials or token were supplied for this implementation's tests.

## HTTP contract

Every route below requires `Authorization: Bearer <Firebase ID token>`.
The MVC interceptor verifies the token through Firebase Admin before the controller runs.
`verifyIdToken(token, true)` also checks revocation and disabled users.
No JWT decoding or cryptography is implemented locally.

| Method | Route | Result |
| --- | --- | --- |
| POST | /api/users/profile | 200: new profile or existing profile for this UID |
| GET | /api/users/me | 200 profile; 404 USER_NOT_FOUND means complete the local profile |
| PATCH | /api/users/me/profile | 200 updated profile |
| GET | /api/users/check-username?username=asha_01 | 200 {"available":true/false} |

The unrestricted user list and arbitrary-ID read/update endpoints were removed.
Authentication here applies to `/api/users` routes only. Business endpoints are unchanged;
ERP authorization is not implemented by this change.

POST accepts only these profile fields:

```json
{"username":"asha_01","firstName":"Asha","lastName":"Shah","phone":"1234567890"}
```

Phone may be omitted. Username is 3â€“30 ASCII letters, digits or underscores, and is stored lowercase.
Email is copied from the verified token and stored lowercase. The token's UID is the identity key.
UID, username and email have database uniqueness constraints. New profiles have no business association.
Client-supplied identity fields are never used; the creation DTO does not contain them.

PATCH accepts only firstName, lastName and phone. Missing/null fields remain unchanged.
Supplied blank fields fail validation. Username, email, UID, ID and business cannot be changed here.

Duplicate username: 409 USERNAME_ALREADY_EXISTS / Username already taken.
Duplicate email under another UID: 409 EMAIL_ALREADY_EXISTS / Email already registered.
Missing/invalid/expired/revoked token: 401 UNAUTHORIZED.
Invalid profile or query input: 400 VALIDATION_ERROR.
Unexpected errors retain the safe 500 response. Firebase exception details are not returned or logged.

## Provider linking and duplicate requests

After either email/password login or Google login, call GET /api/users/me with the Firebase ID token.
If the profile is absent, show Complete Profile. Use Firebase's display name as an optional frontend prefill,
show the Firebase email read-only, and ask for a username and names (phone optional).
Send profile data to POST /api/users/profile, never a password.

Link the additional provider to the CURRENT Firebase user using Firebase's client account-linking APIs.
Both providers then use the same Firebase UID, so GET and POST resolve the same PostgreSQL row.
Two independently created Firebase UIDs are not automatically merged based on email.
The backend returns the existing profile for repeated creation calls. Database uniqueness remains the final
guard against concurrent inserts; after a failed insert, the service reloads the winning UID or reports
the username/email conflict. The creation service intentionally does not wrap that retry in one transaction.

## Inspected development database

Read-only inspection on 2026-10-06 found zero rows in public.users. It still had:
id, company, country, department, phone_number, email, first_name, last_name, password, phone, business_id.
password and phone_number were NOT NULL; firebase_uid and username were absent.
No password_reset_tokens table was present. No data or schema changes were executed.

Hibernate ddl-auto=update will not reliably remove obsolete columns or relax the old phone constraint.
Review and run firebase-development-schema.sql separately before starting the updated application.
It locks and checks that users is still empty, preserves the users table and its business relationship,
removes obsolete columns, adds identity fields and unique indexes, and makes phone optional.
It aborts if any users now exist. Do not switch to ddl-auto=create or recreate the database.
For populated environments, first plan UID/username backfill and duplicate resolution; do not run the empty-table script.

## Postman test plan

Set variables `baseUrl=http://localhost:8080` and `firebaseIdToken` to a fresh ID token returned by the
Firebase CLIENT SDK after sign-in (not a Google OAuth token or Firebase custom token).
Set collection Authorization to Bearer Token `{{firebaseIdToken}}`.
Use Content-Type application/json for POST/PATCH. Do not export/share a collection containing live tokens.

1. Before profile creation, GET {{baseUrl}}/api/users/me -> 404 USER_NOT_FOUND.
2. GET {{baseUrl}}/api/users/check-username?username=asha_01 -> available true if unused.
3. POST {{baseUrl}}/api/users/profile with the sample JSON above -> 200 with id, lowercase username,
   trusted firebaseUid/email and business null. Save its id. Repeat with phone omitted for another new user.
4. Repeat the POST with the same token -> 200 with the SAME id; no new profile or changed fields.
5. GET {{baseUrl}}/api/users/me -> the same profile.
6. PATCH {{baseUrl}}/api/users/me/profile with {"firstName":"Anita"} -> 200; all other fields unchanged.
7. PATCH with {"phone":" "} -> 400 VALIDATION_ERROR. PATCH with {} -> unchanged profile.
8. POST with {"username":"bad name","firstName":"","lastName":""} -> 400 VALIDATION_ERROR.
9. GET check-username with `ASHA_01` -> available false. Invalid/missing username -> 400.
10. Sign in as a DIFFERENT Firebase user with a different email and POST using asha_01 -> 409 USERNAME_ALREADY_EXISTS.
11. Missing Authorization, Basic auth, malformed token, expired token, revoked token or a token for another Firebase
    project -> 401 UNAUTHORIZED. No Firebase internals should appear in the response.
12. Try including firebaseUid/email/id/business in profile JSON: these must never set identity or business.
    Unknown JSON fields may be ignored by Jackson; identity still comes only from the verified token.
13. Link Google to the existing Firebase account using the client SDK, sign in with the linked provider, obtain a
    fresh Firebase ID token, and GET /me -> the SAME local id and UID. Repeat POST -> still the same local id.
14. Old GET /api/users, GET /api/users/{id}, and PATCH /api/users/{id}/profile are no longer mapped.

Two distinct UIDs with the same local email produce EMAIL_ALREADY_EXISTS, not an automatic merge.
Firebase may prevent constructing this scenario through normal signup; the service tests cover it directly.

## Verification

Run from backend:

```powershell
.\mvnw.cmd clean compile
.\mvnw.cmd "-Dtest=UserProfileTests,BusinessErrorHandlingTests" test
```

Tests mock FirebaseAuth and the repository, exercising the real verifier/interceptor/controller/service/advice.
They verify delegation to Firebase Admin with revocation checks, identity boundaries, validation, conflicts,
concurrent-insert recovery, and Business error regression behavior. They do not contact live Firebase or mutate PostgreSQL.

References:
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/auth/web/account-linking


## Verification result (2026-10-06)

Clean compilation succeeded. All 18 focused tests passed (14 User/Firebase tests and 4 Business tests), with zero failures or errors.
The command used this machine's existing Maven cache explicitly:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=C:\Users\asus\.m2\repository" -o clean compile "-Dtest=UserProfileTests,BusinessErrorHandlingTests" test
```

Live Firebase sign-in and PostgreSQL persistence were not exercised. Database access was read-only schema inspection.
