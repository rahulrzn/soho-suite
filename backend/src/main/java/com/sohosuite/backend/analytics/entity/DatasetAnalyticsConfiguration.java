package com.sohosuite.backend.analytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "dataset_analytics_config", uniqueConstraints = {
        @UniqueConstraint(name = "dataset_analytics_business_uq", columnNames = "business_id"),
        @UniqueConstraint(name = "dataset_analytics_dataset_uq", columnNames = "dataset_id")
})
public class DatasetAnalyticsConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "dataset_id", nullable = false)
    private Long datasetId;

    @Column(name = "date_column", nullable = false, length = 120)
    private String dateColumn;

    @Column(name = "line_amount_column", nullable = false, length = 120)
    private String lineAmountColumn;

    @Column(name = "order_id_column", nullable = false, length = 120)
    private String orderIdColumn;

    @Column(name = "customer_id_column", length = 120)
    private String customerIdColumn;

    @Column(name = "confirmed_currency", nullable = false, length = 3)
    private String confirmedCurrency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
