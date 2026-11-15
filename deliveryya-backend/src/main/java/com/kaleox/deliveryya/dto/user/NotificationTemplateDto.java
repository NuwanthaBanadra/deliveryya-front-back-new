package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationTemplateDto {

    @NotEmpty
    String title;

    @NotEmpty
    String notificationType;

    @NotEmpty
    String message;
    @NotEmpty
    @Builder.Default
    List<Integer> toUsers = new ArrayList<>();

    @Builder.Default
    List<Integer> notifyTo = new ArrayList<>();


}
