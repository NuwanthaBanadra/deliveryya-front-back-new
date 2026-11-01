package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrderCodeRequestDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrdersDto;
import com.kaleox.deliveryya.entities.Market;
import com.kaleox.deliveryya.entities.Order;
import com.kaleox.deliveryya.entities.OrderCode;
import com.kaleox.deliveryya.entities.OrderCodeRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class OrderSpec {
    public static @NonNull Specification<Order> getOrderSpecification(PaginatedOrdersDto dto) {
        Specification<Order> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isNull(root.get("isDeleted")), cb.isFalse(root.get("isDeleted"))));

        if (dto.getOrderId() != null && dto.getOrderId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getOrderId()));
            return spec;
        }

        if (dto.getMarkerOrderId() != null && dto.getMarkerOrderId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("marketOrder").get("id"), dto.getMarkerOrderId()));
        }

        if (dto.getDeliveryStatusId() != null && dto.getDeliveryStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("deliveryStatus").get("id"), dto.getDeliveryStatusId()));
        }

        if (dto.getPaymentStatusId() != null && dto.getPaymentStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("paymentStatus").get("id"), dto.getPaymentStatusId()));
        }

        if (dto.getPaymentTypeId() != null && dto.getPaymentTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("paymentType").get("id"), dto.getPaymentTypeId()));
        }

        if (dto.getThirdPartySendersId() != null && dto.getThirdPartySendersId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("thirdPartySenders").get("id"), dto.getThirdPartySendersId()));
        }

        if (dto.getSendingUserId() != null && dto.getSendingUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orderCode").get("users").get("id"), dto.getSendingUserId()));
        }

        if (dto.getReceivingUserId() != null && dto.getReceivingUserId() != 0) {
            spec = spec.and((root, query, cb) -> {
                Join<Object, Object> deliveryToJoin = root.join("deliveryTo", JoinType.LEFT);
                Join<Object, Object> deliveryToUserJoin = deliveryToJoin.join("user", JoinType.LEFT);
                return cb.equal(deliveryToUserJoin.get("id"), dto.getReceivingUserId());
            });

        }

        if (dto.getCityId() != null && dto.getCityId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("deliveryTo").get("city").get("id"), dto.getCityId()));
        }

        if (dto.getMinPrice() != null && dto.getMinPrice() > 0) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("totalPrice"), dto.getMinPrice()));
        }

        if (dto.getMaxPrice() != null && dto.getMaxPrice() > 0) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("totalPrice"), dto.getMaxPrice()));
        }

        if (dto.getOrderCode() != null && !dto.getOrderCode().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orderCode").get("code"), dto.getOrderCode()));
        }

        if (dto.getFromDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        }

        if (dto.getToDate() != null) {
            spec = spec.and((root, query, cb) -> {
                LocalDateTime toDate = dto.getToDate();

                // When clients send a date-only value, Jackson binds it to midnight.
                // Treat that as an inclusive whole-day filter instead of truncating the day.
                if (toDate.toLocalTime().equals(LocalTime.MIDNIGHT)) {
                    return cb.lessThan(root.get("createdAt"), toDate.toLocalDate().plusDays(1).atStartOfDay());
                }

                return cb.lessThanOrEqualTo(root.get("createdAt"), toDate);
            });
        }

        if (dto.getDontCollectDeliveryFeeFromCustomer() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("dontCollectDeliveryFeeFromCustomer"), dto.getDontCollectDeliveryFeeFromCustomer()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                query.distinct(true);

                Join<Object, Object> deliveryToJoin = root.join("deliveryTo", JoinType.LEFT);
                Join<Object, Object> thirdPartyJoin = root.join("thirdPartySenders", JoinType.LEFT);
                Join<Object, Object> marketOrderJoin = root.join("marketOrder", JoinType.LEFT);
                Join<Object, Object> marketOrderUserJoin = marketOrderJoin.join("user", JoinType.LEFT);

                List<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(cb.like(cb.lower(root.get("orderCode").get("code")), searchTerm));

                boolean searchThroughAllDeliveryTo = isEnabled(dto.getSearchThoughDeliveryTo());
                if (searchThroughAllDeliveryTo || isEnabled(dto.getSearchThoughDeliveryToAddress())) {
                    searchPredicates.add(cb.like(cb.lower(deliveryToJoin.get("address")), searchTerm));
                }
                if (searchThroughAllDeliveryTo || isEnabled(dto.getSearchThoughDeliveryToFullName())) {
                    searchPredicates.add(cb.like(cb.lower(deliveryToJoin.get("fullName")), searchTerm));
                }
                if (searchThroughAllDeliveryTo || isEnabled(dto.getSearchThoughDeliveryToMobileNumbers())) {
                    searchPredicates.add(cb.like(cb.lower(deliveryToJoin.get("primaryMobile")), searchTerm));
                    searchPredicates.add(cb.like(cb.lower(deliveryToJoin.get("secondaryMobile")), searchTerm));
                    searchPredicates.add(cb.like(cb.lower(deliveryToJoin.get("whatsapp")), searchTerm));
                }

                if (isEnabled(dto.getSearchThoughThirdPartyName())) {
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("name")), searchTerm));
                }
                if (isEnabled(dto.getSearchThoughThirdPartyNic())) {
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("nic")), searchTerm));
                }
                if (isEnabled(dto.getSearchThoughThirdPartyNote())) {
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("note")), searchTerm));
                }
                if (isEnabled(dto.getSearchThoughThirdPartyAddress())) {
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("address")), searchTerm));
                }
                if (isEnabled(dto.getSearchThoughThirdPartyMobileNumbers())) {
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("first_mob")), searchTerm));
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("sec_mob")), searchTerm));
                    searchPredicates.add(cb.like(cb.lower(thirdPartyJoin.get("whatsapp")), searchTerm));
                }

                if (isEnabled(dto.getSearchThoughMarketOrderName())) {
                    Predicate marketOrderNameMatch = cb.or(
                            cb.like(cb.lower(marketOrderUserJoin.get("firstName")), searchTerm),
                            cb.like(cb.lower(marketOrderUserJoin.get("lastName")), searchTerm),
                            cb.like(
                                    cb.lower(
                                            cb.concat(
                                                    cb.coalesce(marketOrderUserJoin.get("firstName"), ""),
                                                    cb.concat(" ", cb.coalesce(marketOrderUserJoin.get("lastName"), ""))
                                            )
                                    ),
                                    searchTerm
                            )
                    );
                    searchPredicates.add(cb.and(cb.isNotNull(root.get("marketOrder")), marketOrderNameMatch));
                }

                if (isEnabled(dto.getSearchThoughMarketName())) {
                    var marketNameSubQuery = query.subquery(Integer.class);
                    var marketRoot = marketNameSubQuery.from(Market.class);
                    marketNameSubQuery.select(marketRoot.get("id"));
                    marketNameSubQuery.where(
                            cb.equal(marketRoot.get("users").get("id"), root.get("orderCode").get("users").get("id")),
                            cb.like(cb.lower(marketRoot.get("name")), searchTerm)
                    );
                    searchPredicates.add(cb.and(cb.isNotNull(root.get("marketOrder")), cb.exists(marketNameSubQuery)));
                }

                return cb.or(searchPredicates.toArray(new Predicate[0]));

            });
        }

        return spec;
    }

    private static boolean isEnabled(Boolean flag) {
        return !Boolean.FALSE.equals(flag);
    }

    public static @NonNull Specification<OrderCodeRequest> getOrderCodeRequestSpecification(PaginatedOrderCodeRequestDto dto) {
        Specification<OrderCodeRequest> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getId() != null && dto.getId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getId()));
            return spec;
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), dto.getUserId()));
        }

        if (dto.getPrinted() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("printed"), dto.getPrinted()));
        }

        if (dto.getPrintedBarcodesNeeded() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("printedBarcodesNeeded"), dto.getPrintedBarcodesNeeded()));
        }

        return spec;
    }

    public static @NonNull Specification<OrderCode> getOrderCodeSpecification(Integer userId, Boolean isFilled) {
        Specification<OrderCode> spec = (root, query, cb) -> cb.conjunction();

        if (userId != null && userId != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("users").get("id"), userId));
        }

        if (isFilled != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("field"), isFilled));
        }

        return spec;
    }
}

