package com.kaleox.deliveryya.dto.agentjob;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedAgentJobDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer agentJobId;
    Integer userId;

    Boolean accepted;

    /** Search by employee first name or last name */
    String search;

    List<?> items;
}

