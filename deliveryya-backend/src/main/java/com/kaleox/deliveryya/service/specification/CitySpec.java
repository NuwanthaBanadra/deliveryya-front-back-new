package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCityDto;
import com.kaleox.deliveryya.entities.City;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class CitySpec {
    public static @NonNull Specification<City> getCitySpecification(PaginatedCityDto dto) {
        Specification<City> spec = (root, query, cb) -> cb.conjunction();

        // Filter by specific city ID if provided - returns only that city
        if (dto.getCityId() != null && dto.getCityId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getCityId()));
            return spec;
        }

        // Filter by district ID if provided
        if (dto.getDistrictId() != null && dto.getDistrictId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("district").get("id"), dto.getDistrictId()));
        }

        // Search by city name or district name (case-insensitive, partial match)
        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";

                Predicate byCityName = cb.like(cb.lower(root.get("name")), searchTerm);
                Predicate byDistrictName = cb.like(cb.lower(root.get("district").get("name")), searchTerm);

                return cb.or(byCityName, byDistrictName);
            });
        }

        return spec;
    }
}
