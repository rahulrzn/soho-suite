package com.sohosuite.backend.business;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
@Entity
@Table(name = "business")
public class Business {
    
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    
    private String Country;
    private String Company;
    private String Department;
}
