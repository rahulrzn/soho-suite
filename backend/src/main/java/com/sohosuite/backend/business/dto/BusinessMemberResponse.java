package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.entity.BusinessMembership;

public record BusinessMemberResponse(Long userId, String username, String firstName,
                                     String lastName, BusinessRole role) {
    public static BusinessMemberResponse from(BusinessMembership membership) {
        var user = membership.getUser();
        return new BusinessMemberResponse(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), membership.getRole());
    }
}
