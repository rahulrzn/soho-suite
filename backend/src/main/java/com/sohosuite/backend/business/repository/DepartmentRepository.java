package com.sohosuite.backend.business.repository;

import com.sohosuite.backend.business.entity.Department;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    @Query("select d from Department d where d.business.id = :businessId order by d.id")
    List<Department> findAllForBusiness(@Param("businessId") Long businessId);

    @Query("select count(d) > 0 from Department d where d.business.id = :businessId and lower(d.departmentCode) = lower(:code) and (:excludeId is null or d.id <> :excludeId)")
    boolean codeExists(@Param("businessId") Long businessId, @Param("code") String code, @Param("excludeId") Long excludeId);
}
