package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.entity.BusinessLocation;
import com.sohosuite.backend.business.enums.LocationType;

public record BusinessLocationResponse(Long id, String locationCode, String locationName,
        LocationType locationType, String addressLine1, String addressLine2, String city,
        String state, String postalCode, String country, boolean isRegisteredAddress, boolean isActive) {
    public static BusinessLocationResponse from(BusinessLocation row) {
        return new BusinessLocationResponse(row.getId(), row.getLocationCode(), row.getLocationName(),
                row.getLocationType(), row.getAddressLine1(), row.getAddressLine2(), row.getCity(),
                row.getState(), row.getPostalCode(), row.getCountry(), row.isRegisteredAddress(), row.isActive());
    }
}
