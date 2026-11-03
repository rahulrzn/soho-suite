package com.sohosuite.backend.analytics.repository;

import com.sohosuite.backend.analytics.entity.DatasetAnalyticsConfiguration;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetAnalyticsConfigurationRepository
        extends JpaRepository<DatasetAnalyticsConfiguration, Long> {

    Optional<DatasetAnalyticsConfiguration> findByBusinessId(Long businessId);
}
