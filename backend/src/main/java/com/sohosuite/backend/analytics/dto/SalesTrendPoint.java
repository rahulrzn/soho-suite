package com.sohosuite.backend.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesTrendPoint(LocalDate date, BigDecimal salesAmount) {}
