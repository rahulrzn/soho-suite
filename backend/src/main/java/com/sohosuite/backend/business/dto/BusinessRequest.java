package com.sohosuite.backend.business.dto;

import java.util.List;
import java.util.Objects;
import com.sohosuite.backend.business.enums.BusinessStatus;
import com.sohosuite.backend.business.enums.BusinessType;
import com.sohosuite.backend.business.enums.LegalStructure;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BusinessRequest {
    @JsonProperty("company")
    @Size(max = 255)
    private String companyName;
    @Size(max = 255)
    private String legalBusinessName;
    @Size(max = 255)
    private String tradingName;
    private BusinessType businessType;
    @Size(max = 255)
    private String industry;
    private LegalStructure legalStructure;
    @Email(message = "Enter a valid Business Email")
    @Size(max = 255)
    private String businessEmail;
    @Pattern(regexp = "[A-Z]{3}", message = "Currency must be an uppercase ISO 4217 code")
    private String businessCurrency;
    @Min(1) @Max(12)
    private Integer financialYearStartMonth;
    private BusinessStatus businessStatus;

    @Size(max = 255)
    private String country;
    @Size(max = 255)
    private String state;
    @Size(max = 255)
    private String city;
    @JsonProperty("pincode")
    @Size(max = 255)
    private String postalCode;
    @Size(max = 255)
    private String department;

    @Valid
    private List<@Valid BusinessLocationRequest> locations;
    @Valid
    private List<@Valid BusinessTaxRegistrationRequest> taxRegistrations;
    @Valid
    private List<@Valid DepartmentRequest> departments;

    private boolean companyNameProvided;
    private boolean countryProvided;
    private boolean stateProvided;
    private boolean cityProvided;
    private boolean postalCodeProvided;
    private boolean locationsProvided;
    private boolean taxRegistrationsProvided;
    private boolean departmentsProvided;

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
        this.companyNameProvided = true;
    }
    public void setCountry(String country) { this.country = country; this.countryProvided = true; }
    public void setState(String state) { this.state = state; this.stateProvided = true; }
    public void setCity(String city) { this.city = city; this.cityProvided = true; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; this.postalCodeProvided = true; }
    public void setLocations(List<@Valid BusinessLocationRequest> locations) { this.locations = locations; this.locationsProvided = true; }
    public void setTaxRegistrations(List<@Valid BusinessTaxRegistrationRequest> taxRegistrations) { this.taxRegistrations = taxRegistrations; this.taxRegistrationsProvided = true; }
    public void setDepartments(List<@Valid DepartmentRequest> departments) { this.departments = departments; this.departmentsProvided = true; }

    @AssertTrue(message = "company and tradingName must match when both are supplied")
    public boolean isLegacyCompanyConsistent() {
        if (companyName == null || companyName.isBlank() || tradingName == null || tradingName.isBlank()) return true;
        return Objects.equals(companyName.trim(), tradingName.trim());
    }
}
