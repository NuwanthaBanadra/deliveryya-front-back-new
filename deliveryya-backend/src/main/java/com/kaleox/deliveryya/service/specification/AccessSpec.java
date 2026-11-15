package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedGrantedAccessesDto;
import com.kaleox.deliveryya.entities.Access;
import com.kaleox.deliveryya.entities.AccessHasApi;
import com.kaleox.deliveryya.entities.AccessHasUserRole;
import com.kaleox.deliveryya.entities.UserHasAccess;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class AccessSpec {

    public static @NonNull Specification<Access> getAccessSpecification(PaginatedGrantedAccessesDto dto) {
        Specification<Access> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getAccessId() != null && dto.getAccessId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getAccessId()));
        }

        if (dto.getApiIds() != null && !dto.getApiIds().isEmpty()) {
            spec = spec.and((root, query, cb) -> {
                var subQuery = query.subquery(Integer.class);
                var subRoot = subQuery.from(AccessHasApi.class);
                subQuery.select(subRoot.get("access").get("id"));
                subQuery.where(subRoot.get("api").get("id").in(dto.getApiIds()));
                return root.get("id").in(subQuery);
            });
        }

        if (dto.getAccessTypeId() != null && dto.getAccessTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accessType").get("id"), dto.getAccessTypeId()));
        }

        if (dto.getAccessLevelId() != null && dto.getAccessLevelId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accessLevel").get("id"), dto.getAccessLevelId()));
        }

        if (dto.getUserRoleId() != null && dto.getUserRoleId() != 0) {
            spec = spec.and((root, query, cb) -> {
                var subQuery = query.subquery(Integer.class);
                var subRoot = subQuery.from(AccessHasUserRole.class);
                subQuery.select(subRoot.get("access").get("id"));
                subQuery.where(cb.equal(subRoot.get("userRoles").get("id"), dto.getUserRoleId()));
                return root.get("id").in(subQuery);
            });
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> {
                var subQuery = query.subquery(Integer.class);
                var subRoot = subQuery.from(UserHasAccess.class);
                subQuery.select(subRoot.get("access").get("id"));
                subQuery.where(cb.equal(subRoot.get("users").get("id"), dto.getUserId()));
                return root.get("id").in(subQuery);
            });
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String term = "%" + dto.getSearch().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("desc")), term)
            ));
        }

        return spec;
    }
}

