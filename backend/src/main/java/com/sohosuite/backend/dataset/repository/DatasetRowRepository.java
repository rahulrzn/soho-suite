package com.sohosuite.backend.dataset.repository;
import com.sohosuite.backend.dataset.entity.DatasetRow;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DatasetRowRepository extends JpaRepository<DatasetRow, Long> {
    List<DatasetRow> findAllByDatasetIdOrderByRowNumber(Long datasetId, Pageable pageable);
    long countByDatasetId(Long datasetId);
    void deleteAllByDatasetId(Long datasetId);
}
