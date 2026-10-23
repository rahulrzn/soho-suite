package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.entity.Department;

public record DepartmentResponse(Long id, String departmentCode, String departmentName, boolean isActive) {
    public static DepartmentResponse from(Department row) {
        return new DepartmentResponse(row.getId(), row.getDepartmentCode(), row.getDepartmentName(), row.isActive());
    }
}
