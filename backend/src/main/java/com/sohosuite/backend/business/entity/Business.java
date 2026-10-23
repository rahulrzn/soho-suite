package com.sohosuite.backend.business.entity;

import com.sohosuite.backend.business.enums.BusinessStatus;
import com.sohosuite.backend.business.enums.BusinessType;
import com.sohosuite.backend.business.enums.LegalStructure;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "business")
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_code", nullable = false, unique = true, updatable = false, length = 32)
    private String businessCode;

    @Column(name = "legal_business_name")
    private String legalBusinessName;

    @Column(name = "trading_name")
    private String tradingName;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", length = 40)
    private BusinessType businessType;

    private String industry;

    @Enumerated(EnumType.STRING)
    @Column(name = "legal_structure", length = 40)
    private LegalStructure legalStructure;

    @Column(name = "business_currency", nullable = false, length = 3)
    private String businessCurrency = "INR";

    @Min(1)
    @Max(12)
    @Column(name = "financial_year_start_month", nullable = false)
    private Integer financialYearStartMonth = 4;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_status", nullable = false, length = 20)
    private BusinessStatus businessStatus = BusinessStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    private String country;

    private String state;

    private String city;

    @JsonProperty("pincode")
    @Column(name = "pincode")
    private String postalCode;

    @JsonProperty("company")
    @Column(name = "company")
    private String companyName;

    private String department;

    @Email(message = "Enter a valid Business Email")
    private String businessEmail;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (businessCurrency == null) businessCurrency = "INR";
        if (financialYearStartMonth == null) financialYearStartMonth = 4;
        if (businessStatus == null) businessStatus = BusinessStatus.ACTIVE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
