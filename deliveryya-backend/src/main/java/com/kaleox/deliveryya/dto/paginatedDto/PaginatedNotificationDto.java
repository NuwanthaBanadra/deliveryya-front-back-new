package com.kaleox.deliveryya.dto.paginatedDto;

import com.kaleox.deliveryya.dto.NotificationDto;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaginatedNotificationDto {

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    List<NotificationDto> items;

    Integer userId;
} // End of class PaginatedNotificationDto


