package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedComplainDto;
import com.kaleox.deliveryya.entities.Complain;
import com.kaleox.deliveryya.entities.Order;
import com.kaleox.deliveryya.entities.OrderCode;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class ComplainSpec {

    public static @NonNull Specification<Complain> getComplainSpecification(PaginatedComplainDto dto) {
        Specification<Complain> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getComplainId() != null && dto.getComplainId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getComplainId()));
            return spec;
        }

        if (dto.getOrderId() != null && dto.getOrderId() != 0) {
            spec = spec.and((root, query, cb) -> hasOrderIdMatch(root, query.subquery(Long.class), cb, dto.getOrderId()));
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> hasOrderUserMatch(root, query.subquery(Long.class), cb, dto.getUserId()));
        }

        if (dto.getPlacedUserId() != null && dto.getPlacedUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("createdBy"), String.valueOf(dto.getPlacedUserId())));
        }

        if (dto.getComplainTypeId() != null && dto.getComplainTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("complainType").get("id"), dto.getComplainTypeId()));
        }

        if (dto.getComplainStatusId() != null && dto.getComplainStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("complainStatus").get("id"), dto.getComplainStatusId()));
        }

        if (dto.getIsSolve() != null && dto.getIsSolve() >= 0) {
            boolean isSolveValue = dto.getIsSolve() > 0;
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isSolve"), isSolveValue));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank() && !"0".equals(dto.getSearch())) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().trim().toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("subject"), "")), searchTerm),
                        cb.like(cb.lower(cb.coalesce(root.get("complain"), "")), searchTerm),
                        cb.like(cb.lower(cb.coalesce(root.get("code"), "")), searchTerm)
                );
            });
        }

        return spec;
    }

    private static jakarta.persistence.criteria.Predicate hasOrderIdMatch(
            Root<Complain> root,
            Subquery<Long> subquery,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            Integer orderId
    ) {
        Root<Order> order = subquery.from(Order.class);
        Join<Order, OrderCode> orderCodeJoin = order.join("orderCode", JoinType.INNER);

        subquery.select(cb.literal(1L)).where(
                cb.equal(cb.lower(cb.coalesce(root.get("code"), "")), cb.lower(cb.coalesce(orderCodeJoin.get("code"), ""))),
                cb.equal(order.get("id"), orderId)
        );

        return cb.exists(subquery);
    }

    private static jakarta.persistence.criteria.Predicate hasOrderUserMatch(
            Root<Complain> root,
            Subquery<Long> subquery,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            Integer userId
    ) {
        Root<Order> order = subquery.from(Order.class);
        Join<Order, OrderCode> orderCodeJoin = order.join("orderCode", JoinType.INNER);

        subquery.select(cb.literal(1L)).where(
                cb.equal(cb.lower(cb.coalesce(root.get("code"), "")), cb.lower(cb.coalesce(orderCodeJoin.get("code"), ""))),
                cb.equal(orderCodeJoin.get("users").get("id"), userId)
        );

        return cb.exists(subquery);
    }
}
