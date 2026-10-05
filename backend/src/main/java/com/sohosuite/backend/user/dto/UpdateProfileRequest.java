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
