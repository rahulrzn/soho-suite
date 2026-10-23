package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.user.entity.User;

public record BusinessMemberResponse(Long userId, String username, String firstName,
                                     String lastName, BusinessRole role) {
    public static BusinessMemberResponse from(User user) {
        return new BusinessMemberResponse(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getBusinessRole());
    }
}
