package com.kaleox.deliveryya.dto.feedbacks;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FeedbackDTO {

    Integer id;

    @Size(max = 100)
    String comment;

    @NotNull
    @Min(1)
    @Max(5)
    Integer rating;

    @NotNull
    @Min(1)
    Integer productId;

    Integer userId;
    String userName;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
