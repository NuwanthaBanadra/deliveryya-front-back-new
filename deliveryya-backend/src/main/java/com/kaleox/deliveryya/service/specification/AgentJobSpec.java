package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.agentjob.PaginatedAgentJobDto;
import com.kaleox.deliveryya.entities.AgentJob;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class AgentJobSpec {

    public static @NonNull Specification<AgentJob> getAgentJobSpecification(PaginatedAgentJobDto dto) {
        Specification<AgentJob> spec = (root, query, cb) -> cb.conjunction();

        // Exact lookup by ID – returns only that record
        if (dto.getAgentJobId() != null && dto.getAgentJobId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getAgentJobId()));
            return spec;
        }

        // Filter by employee
        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> empJoin = root.join("employees", JoinType.LEFT);
                Join<Object, Object> userJoin = empJoin.join("users", JoinType.LEFT);
                return cb.equal(userJoin.get("id"), dto.getUserId());
            });
        }

        // Filter by accepted flag
        if (dto.getAccepted() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accepted"), dto.getAccepted()));
        }

        // Search by employee user firstName or lastName
        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String term = "%" + dto.getSearch().toLowerCase() + "%";

                Join<Object, Object> empJoin = root.join("employees", JoinType.LEFT);
                Join<Object, Object> userJoin = empJoin.join("users", JoinType.LEFT);
                Join<Object, Object> taskJoin = root.join("agentJobTasks", JoinType.LEFT);
                query.distinct(true);

                return cb.or(
                        cb.like(cb.lower(userJoin.get("firstName")), term),
                        cb.like(cb.lower(userJoin.get("lastName")), term),
                        cb.like(cb.lower(root.get("task")), term),
                        cb.like(cb.lower(taskJoin.get("task")), term),
                        cb.like(cb.lower(taskJoin.get("location")), term)
                );
            });
        }

        return spec;
    }
}

