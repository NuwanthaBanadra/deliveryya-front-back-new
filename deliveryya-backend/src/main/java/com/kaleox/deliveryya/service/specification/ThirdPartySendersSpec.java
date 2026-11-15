package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedThirdPartySendersDto;
import com.kaleox.deliveryya.entities.ThirdPartySenders;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class ThirdPartySendersSpec {

    public static @NonNull Specification<ThirdPartySenders> getThirdPartySendersSpecification(PaginatedThirdPartySendersDto dto) {
        Specification<ThirdPartySenders> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("isDeleted")), cb.isFalse(root.get("isDeleted"))));

        if (dto.getId() != null && dto.getId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getId()));
            return spec;
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                List<Predicate> predicates = new ArrayList<>();

                predicates.add(cb.like(cb.lower(root.get("name")), searchTerm));
                predicates.add(cb.like(cb.lower(root.get("whatsapp")), searchTerm));
                predicates.add(cb.like(cb.lower(root.get("first_mob")), searchTerm));
                predicates.add(cb.like(cb.lower(root.get("sec_mob")), searchTerm));

                if (Boolean.TRUE.equals(dto.getSearchAddress())) {
                    predicates.add(cb.like(cb.lower(root.get("address")), searchTerm));
                }

                if (Boolean.TRUE.equals(dto.getSearchNote())) {
                    predicates.add(cb.like(cb.lower(root.get("note")), searchTerm));
                }

                return cb.or(predicates.toArray(new Predicate[0]));
            });
        }

        return spec;
    }
}
