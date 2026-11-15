package com.kaleox.deliveryya.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForceDeletePreviewDto {
    private String entityName;
    private Integer entityId;
    private String entityIdentifier;
    private Boolean canDelete;
    private String blockingReason;
    private Map<String, Long> relatedRecordCounts;
    private List<String> recordsToBeDeleted;
    private List<String> recordsToBeDetached;
}
