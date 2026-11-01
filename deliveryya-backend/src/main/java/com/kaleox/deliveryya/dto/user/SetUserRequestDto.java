package com.kaleox.deliveryya.dto.user;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SetUserRequestDto {

    @NotBlank(message = "Title is required")
    @Size(max = 100, message = "Title can contain at most 100 characters")
    String title;

    @NotBlank(message = "Description is required")
    String desc;

    @JsonAlias("docsUrls")
    List<String> docUrls;

    @NotNull(message = "Request type id is required")
    Integer userRequestTypeId;
}

