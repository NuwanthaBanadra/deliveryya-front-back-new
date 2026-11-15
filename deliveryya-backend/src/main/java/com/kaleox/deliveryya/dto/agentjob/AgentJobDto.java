package com.kaleox.deliveryya.dto.agentjob;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for AgentJob.
 *
 * createdBy stores the userId of the user who created the job (via Spring Auditing).
 * createdByUser resolves that ID to full user details.
 */
public record AgentJobDto(
        Integer id,
        String task,
        Boolean accepted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<TaskRef> tasks,

        // Nullable: only present when linked to an urgent job.
        UrgentJobRef urgentJob,

        EmployeeRef employee,

        // Nullable: resolved from the createdBy audit field (userId string).
        UserRef createdByUser
) implements Serializable {

    public record TaskRef(
            Integer id,
            String task,
            String location,
            Boolean isComplete,
            LocalDateTime beAt
    ) implements Serializable {}

    /** Minimal urgent-job projection */
    public record UrgentJobRef(Integer id, String jobCode) implements Serializable {}

    /** Employee projection including the underlying user details */
    public record EmployeeRef(
            Integer id,
            Integer userId,
            String firstName,
            String lastName,
            String mobile,
            String whatsapp
    ) implements Serializable {}

    /** User projection used for createdByUser */
    public record UserRef(
            Integer id,
            String firstName,
            String lastName,
            String email
    ) implements Serializable {}
}

