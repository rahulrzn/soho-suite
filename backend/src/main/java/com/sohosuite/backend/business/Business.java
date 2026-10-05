package com.sohosuite.backend.business;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "business")
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Country is required")
    private String country;

    private String state;

    private String city;

    @NotBlank(message = "Pin code is required")
    private String pincode;

    @NotBlank(message = "Company name is required")
    private String company;

    private String department;

    @Email(message = "Enter a valid Business Email")
    private String businessEmail;
}
