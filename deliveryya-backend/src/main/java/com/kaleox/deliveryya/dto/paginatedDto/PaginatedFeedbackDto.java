package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.feedbacks.FeedbackDTO;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedFeedbackDto {
    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer productId;
    Integer userId;

    String search;

    LocalDateTime fromDate;
    LocalDateTime toDate;

    List<FeedbackDTO> feedbacks;
}
