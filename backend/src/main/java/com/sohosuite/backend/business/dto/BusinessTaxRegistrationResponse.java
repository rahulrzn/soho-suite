package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.entity.BusinessTaxRegistration;
import com.sohosuite.backend.business.enums.TaxRegistrationStatus;

public record BusinessTaxRegistrationResponse(Long id, String registrationType,
        String registrationNumber, String jurisdiction, TaxRegistrationStatus status) {
    public static BusinessTaxRegistrationResponse from(BusinessTaxRegistration row) {
        return new BusinessTaxRegistrationResponse(row.getId(), row.getRegistrationType(),
                row.getRegistrationNumber(), row.getJurisdiction(), row.getStatus());
    }
}
