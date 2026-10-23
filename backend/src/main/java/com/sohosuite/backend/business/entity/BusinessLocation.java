package com.sohosuite.backend.business.entity;

import com.sohosuite.backend.business.enums.LocationType;

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
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "business_location")
public class BusinessLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @NotBlank
    @Size(max = 40)
    @Column(name = "location_code", nullable = false, length = 40)
    private String locationCode;

    @Size(max = 120)
    @Column(name = "location_name", length = 120)
    private String locationName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "location_type", nullable = false, length = 30)
    private LocationType locationType;

    @Size(max = 255)
    @Column(name = "address_line1")
    private String addressLine1;

    @Size(max = 255)
    @Column(name = "address_line2")
    private String addressLine2;

    @Size(max = 120)
    private String city;

    @Size(max = 120)
    private String state;

    @Size(max = 40)
    @Column(name = "postal_code", length = 40)
    private String postalCode;

    @Size(max = 120)
    private String country;

    @Column(name = "is_registered_address", nullable = false)
    private boolean registeredAddress;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
