package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedApiDto;
import com.kaleox.deliveryya.entities.AccessHasApi;
import com.kaleox.deliveryya.entities.Api;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class ApiSpec {

    public static @NonNull Specification<Api> getApiSpecification(PaginatedApiDto dto) {
        Specification<Api> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getAccessId() != null && dto.getAccessId() > 0) {
            spec = spec.and((root, query, cb) -> {
                var subQuery = query.subquery(Integer.class);
                var subRoot = subQuery.from(AccessHasApi.class);
                subQuery.select(subRoot.get("api").get("id"));
                subQuery.where(cb.equal(subRoot.get("access").get("id"), dto.getAccessId()));
                return root.get("id").in(subQuery);
            });
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String term = "%" + dto.getSearch().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("desc")), term),
                    cb.like(cb.lower(root.get("apiMethod").get("name")), term)
            ));
        }

        return spec;
    }
}
