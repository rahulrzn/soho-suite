package com.sohosuite.backend.business.entity;

import com.sohosuite.backend.business.enums.TaxRegistrationStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "business_tax_registration")
public class BusinessTaxRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @NotBlank
    @Pattern(regexp = "[A-Z][A-Z0-9_]{1,39}")
    @Column(name = "registration_type", nullable = false, length = 40)
    private String registrationType;

    @NotBlank
    @Size(max = 100)
    @Column(name = "registration_number", nullable = false, length = 100)
    private String registrationNumber;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String jurisdiction;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxRegistrationStatus status = TaxRegistrationStatus.ACTIVE;
}
