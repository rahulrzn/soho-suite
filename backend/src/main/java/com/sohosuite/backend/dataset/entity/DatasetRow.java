package com.sohosuite.backend.dataset.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity @Table(name="dataset_row")
public class DatasetRow {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="dataset_id", nullable=false) private Long datasetId;
    @Column(name="row_number", nullable=false) private int rowNumber;
    @Column(name="values_json", nullable=false, columnDefinition="text") private String valuesJson;
}
