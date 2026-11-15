package com.kaleox.deliveryya.dto.paginatedDto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedUrgentJobDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer urgentJobId;
    Integer jobStatusId;
    Integer verificationStatusId;
    Integer vehicleTypeId;
    String placedUserId;

    String jobCode;
    String mobile;
    String nic;
    String email;

    String search;
    List<?> items;
}

