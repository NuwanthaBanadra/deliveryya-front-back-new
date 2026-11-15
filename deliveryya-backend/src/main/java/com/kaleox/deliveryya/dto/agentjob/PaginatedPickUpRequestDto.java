package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedPickUpRequestDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer pickupRequestId;
    Integer userId;
    Boolean isAccepted;
    Boolean isCompleted;

    String message;
    String search;

    LocalDateTime fromDate;
    LocalDateTime toDate;

    List<?> items;
}

