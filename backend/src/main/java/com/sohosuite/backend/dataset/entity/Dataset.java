package com.sohosuite.backend.dataset.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "dataset")
public class Dataset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name="business_id", nullable=false) private Long businessId;
    @Column(name="created_by") private Long createdBy;
    @Column(nullable=false, length=120) private String name;
    @Column(length=500) private String description;
    @Column(name="original_filename", nullable=false) private String originalFilename;
    @Column(name="file_type", nullable=false, length=10) private String fileType;
    @Column(nullable=false, length=20) private String status;
    @Column(name="row_count", nullable=false) private int rowCount;
    @Column(name="column_count", nullable=false) private int columnCount;
    @Column(name="columns_json", nullable=false, columnDefinition="text") private String columnsJson;
    @Column(name="findings_json", nullable=false, columnDefinition="text") private String findingsJson;
    @Column(name="idempotency_key", nullable=false, length=80) private String idempotencyKey;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="imported_at") private Instant importedAt;
}
