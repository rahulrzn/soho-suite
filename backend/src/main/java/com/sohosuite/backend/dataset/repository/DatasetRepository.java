package com.sohosuite.backend.dataset.repository;
import com.sohosuite.backend.dataset.entity.Dataset;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DatasetRepository extends JpaRepository<Dataset, Long> {
    List<Dataset> findAllByBusinessIdOrderByCreatedAtDesc(Long businessId);
    Optional<Dataset> findByBusinessIdAndIdempotencyKey(Long businessId, String key);
    Optional<Dataset> findByBusinessIdAndId(Long businessId, Long id);
}
