package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedPaymentRecodeDto;
import com.kaleox.deliveryya.entities.Order;
import com.kaleox.deliveryya.entities.OrderCode;
import com.kaleox.deliveryya.entities.PaymentRecord;
import com.kaleox.deliveryya.entities.PaymentRecordItems;
import com.kaleox.deliveryya.entities.UrgentJob;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class PaymentRecodeSpec {

    public static @NonNull Specification<PaymentRecord> getPaymentRecodeSpecification(PaginatedPaymentRecodeDto dto) {
        Specification<PaymentRecord> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getPaymentRecodeId() != null && dto.getPaymentRecodeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getPaymentRecodeId()));
            return spec;
        }

        if (dto.getBankId() != null && dto.getBankId() != 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> bankDetailJoin = root.join("bankDetail", JoinType.LEFT);
                Join<Object, Object> bankJoin = bankDetailJoin.join("bank", JoinType.LEFT);
                return cb.equal(bankJoin.get("id"), dto.getBankId());
            });
        }

        if (dto.getFromDate() != null && dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> cb.between(root.get("createdAt"), dto.getFromDate(), dto.getToDate()));
        } else if (dto.getFromDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        } else if (dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), dto.getToDate()));
        }

        if (dto.getBankDetailId() != null && dto.getBankDetailId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.join("bankDetail", JoinType.LEFT).get("id"), dto.getBankDetailId()));
        }

        if (dto.getPaymentTypeId() != null && dto.getPaymentTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.join("paymentType", JoinType.LEFT).get("id"), dto.getPaymentTypeId()));
        }

        if (dto.getVerificationStatusId() != null && dto.getVerificationStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.join("verificationStatus", JoinType.LEFT).get("id"), dto.getVerificationStatusId()));
        }

        if (dto.getMarketId() != null && dto.getMarketId() != 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> bankDetailJoin = root.join("bankDetail", JoinType.LEFT);
                Join<Object, Object> marketJoin = bankDetailJoin.join("market", JoinType.LEFT);
                return cb.equal(marketJoin.get("id"), dto.getMarketId());
            });
        }

        if (dto.getClientId() != null && dto.getClientId() != 0) {
            spec = spec.and((root, query, cb) -> hasOrderItemForClient(root, query.subquery(Long.class), cb, dto.getClientId()));
        }

        if (dto.getOrderId() != null && dto.getOrderId() != 0) {
            spec = spec.and((root, query, cb) -> hasOrderItemForOrderId(root, query.subquery(Long.class), cb, dto.getOrderId()));
        }

        if (dto.getCode() != null && !dto.getCode().isBlank()) {
            spec = spec.and((root, query, cb) -> hasItemCodeMatch(root, query.subquery(Long.class), cb, dto.getCode().trim().toLowerCase()));
        }

        if (dto.getCreatedById() != null && dto.getCreatedById() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("createdBy"), String.valueOf(dto.getCreatedById())));
        }

        if (dto.getIsReturn() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isReturn"), dto.getIsReturn()));
        }

        if (dto.getMinAmount() != null && dto.getMinAmount() > 0) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("amount"), dto.getMinAmount()));
        }

        if (dto.getMaxAmount() != null && dto.getMaxAmount() > 0) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("amount"), dto.getMaxAmount()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";

                Predicate byDesc = cb.like(cb.lower(cb.coalesce(root.get("desc"), "")), searchTerm);
                Predicate byProofUrl = cb.like(cb.lower(cb.coalesce(root.get("proofUrl"), "")), searchTerm);
                Predicate byAccNumber = cb.like(cb.lower(cb.coalesce(root.get("acc_number"), "")), searchTerm);

                Join<Object, Object> paymentTypeJoin = root.join("paymentType", JoinType.LEFT);
                Predicate byPaymentTypeName = cb.like(cb.lower(cb.coalesce(paymentTypeJoin.get("name"), "")), searchTerm);

                Join<Object, Object> verificationStatusJoin = root.join("verificationStatus", JoinType.LEFT);
                Predicate byVerificationStatusName = cb.like(cb.lower(cb.coalesce(verificationStatusJoin.get("name"), "")), searchTerm);

                Join<Object, Object> bankDetailJoin = root.join("bankDetail", JoinType.LEFT);
                Predicate byBankDetailName = cb.like(cb.lower(cb.coalesce(bankDetailJoin.get("name"), "")), searchTerm);

                Predicate byItemContent = hasItemMatchingSearch(root, query.subquery(Long.class), cb, searchTerm);
                Predicate byUrgentJobCode = hasUrgentJobCodeMatch(root, query.subquery(Long.class), cb, searchTerm);

                return cb.or(byDesc, byProofUrl, byAccNumber, byPaymentTypeName, byVerificationStatusName, byBankDetailName, byItemContent, byUrgentJobCode);
            });
        }

        return spec;
    }

    private static Predicate hasItemMatchingSearch(Root<PaymentRecord> root, Subquery<Long> subquery, jakarta.persistence.criteria.CriteriaBuilder cb, String searchTerm) {
        Root<PaymentRecordItems> item = subquery.from(PaymentRecordItems.class);

        Expression<String> itemCodeExpr = cb.lower(cb.coalesce(item.get("code"), ""));
        Expression<String> itemNoteExpr = cb.lower(cb.coalesce(item.get("note"), ""));

        subquery.select(cb.literal(1L)).where(
                cb.equal(item.get("paymentRecord").get("id"), root.get("id")),
                cb.or(
                        cb.like(itemCodeExpr, searchTerm),
                        cb.like(itemNoteExpr, searchTerm)
                )
        );

        return cb.exists(subquery);
    }

    private static Predicate hasUrgentJobCodeMatch(Root<PaymentRecord> root, Subquery<Long> subquery, jakarta.persistence.criteria.CriteriaBuilder cb, String searchTerm) {
        Root<PaymentRecordItems> item = subquery.from(PaymentRecordItems.class);
        Root<UrgentJob> urgentJob = subquery.from(UrgentJob.class);

        subquery.select(cb.literal(1L)).where(
                cb.equal(item.get("paymentRecord").get("id"), root.get("id")),
                cb.equal(cb.lower(cb.coalesce(item.get("code"), "")), cb.lower(cb.coalesce(urgentJob.get("jobCode"), ""))),
                cb.like(cb.lower(cb.coalesce(urgentJob.get("jobCode"), "")), searchTerm)
        );

        return cb.exists(subquery);
    }

    private static Predicate hasOrderItemForOrderId(Root<PaymentRecord> root, Subquery<Long> subquery, jakarta.persistence.criteria.CriteriaBuilder cb, Integer orderId) {
        Root<PaymentRecordItems> item = subquery.from(PaymentRecordItems.class);
        Root<Order> order = subquery.from(Order.class);
        Join<Order, OrderCode> orderCodeJoin = order.join("orderCode", JoinType.INNER);

        subquery.select(cb.literal(1L)).where(
                cb.equal(item.get("paymentRecord").get("id"), root.get("id")),
                cb.equal(cb.lower(cb.coalesce(item.get("code"), "")), cb.lower(cb.coalesce(orderCodeJoin.get("code"), ""))),
                cb.equal(order.get("id"), orderId)
        );

        return cb.exists(subquery);
    }

    private static Predicate hasOrderItemForClient(Root<PaymentRecord> root, Subquery<Long> subquery, jakarta.persistence.criteria.CriteriaBuilder cb, Integer clientId) {
        Root<PaymentRecordItems> item = subquery.from(PaymentRecordItems.class);
        Root<Order> order = subquery.from(Order.class);
        Join<Order, OrderCode> orderCodeJoin = order.join("orderCode", JoinType.INNER);

        subquery.select(cb.literal(1L)).where(
                cb.equal(item.get("paymentRecord").get("id"), root.get("id")),
                cb.equal(cb.lower(cb.coalesce(item.get("code"), "")), cb.lower(cb.coalesce(orderCodeJoin.get("code"), ""))),
                cb.equal(orderCodeJoin.get("users").get("id"), clientId)
        );

        return cb.exists(subquery);
    }

    private static Predicate hasItemCodeMatch(Root<PaymentRecord> root, Subquery<Long> subquery, jakarta.persistence.criteria.CriteriaBuilder cb, String code) {
        Root<PaymentRecordItems> item = subquery.from(PaymentRecordItems.class);

        subquery.select(cb.literal(1L)).where(
                cb.equal(item.get("paymentRecord").get("id"), root.get("id")),
                cb.equal(cb.lower(cb.coalesce(item.get("code"), "")), code)
        );

        return cb.exists(subquery);
    }
}
