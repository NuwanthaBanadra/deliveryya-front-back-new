package com.kaleox.deliveryya.dto.agentjob;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeleteAgentJobDto {

    /**
     * When deleteAll=true the authenticated employee's jobs are deleted.
     * Optionally, a specific employeeId can be provided to override (e.g. admin deleting another employee's jobs).
     */
    Integer userId;

    Boolean deleteAll;

    /**
     * Used when deleteAll=false – list of specific agent job IDs to delete.
     */
    List<Integer> jobIds;
}

