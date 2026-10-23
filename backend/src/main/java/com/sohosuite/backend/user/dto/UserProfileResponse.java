package com.sohosuite.backend.user.dto;

import java.util.List;

import com.sohosuite.backend.business.dto.BusinessResponse;
import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.user.entity.User;

public record UserProfileResponse(
        Long id,
        String firebaseUid,
        String username,
        String firstName,
        String lastName,
        String email,
        String phone,
        BusinessResponse business,
        BusinessRole businessRole) {

    public static UserProfileResponse from(User user) {
        Business business = user.getBusiness();
        BusinessResponse businessResponse = business == null ? null
                : BusinessResponse.from(business, List.of(), List.of(), List.of());
        return new UserProfileResponse(user.getId(), user.getFirebaseUid(), user.getUsername(),
                user.getFirstName(), user.getLastName(), user.getEmail(), user.getPhoneNumber(),
                businessResponse, user.getBusinessRole());
    }
}
