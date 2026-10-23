package com.sohosuite.backend.business.dto;

import java.time.Instant;
import java.util.List;
import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.enums.BusinessStatus;
import com.sohosuite.backend.business.enums.BusinessType;
import com.sohosuite.backend.business.enums.LegalStructure;

public record BusinessResponse(
        Long id, String businessCode, String company, String legalBusinessName, String tradingName,
        BusinessType businessType, String industry, LegalStructure legalStructure, String businessEmail,
        String businessCurrency, Integer financialYearStartMonth, BusinessStatus businessStatus,
        Instant createdAt, Instant updatedAt, String country, String state, String city, String pincode,
        String department, List<BusinessLocationResponse> locations,
        List<BusinessTaxRegistrationResponse> taxRegistrations,
        List<DepartmentResponse> departments) {
    public static BusinessResponse from(Business business, List<BusinessLocationResponse> locations,
            List<BusinessTaxRegistrationResponse> taxRegistrations, List<DepartmentResponse> departments) {
        return new BusinessResponse(business.getId(), business.getBusinessCode(), business.getCompanyName(),
                business.getLegalBusinessName(), business.getTradingName(), business.getBusinessType(),
                business.getIndustry(), business.getLegalStructure(), business.getBusinessEmail(),
                business.getBusinessCurrency(), business.getFinancialYearStartMonth(), business.getBusinessStatus(),
                business.getCreatedAt(), business.getUpdatedAt(), business.getCountry(), business.getState(),
                business.getCity(), business.getPostalCode(), business.getDepartment(), locations,
                taxRegistrations, departments);
    }
}
