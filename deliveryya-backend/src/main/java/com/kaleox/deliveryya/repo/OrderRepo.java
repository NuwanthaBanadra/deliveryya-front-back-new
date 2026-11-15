package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepo extends JpaRepository<Order, Integer>, JpaSpecificationExecutor<Order> {

    Optional<Order> findByOrderCode_Id(Integer orderCodeId);

    Optional<Order> findByOrderCode_code(String orderCodeCode);

    Optional<Order> findByIdOrOrderCode_Code(Integer id, String orderCodeCode);

    boolean existsByThirdPartySenders_Id(Integer thirdPartySenderId);

    List<Order> findByOrderCode_Users_Id(Integer userId);

    @Query("""
            select count(o.id),
                   coalesce(sum(o.totalPrice), 0),
                   coalesce(sum(coalesce(o.collectivePrice, 0) - coalesce(o.deliveryFee, 0)), 0)
            from Order o
            where o.orderCode.users.id = :userId
            """)
    Object[] findOverallAggregatesByUserId(@Param("userId") Integer userId);

    @Query("""
            select o.deliveryStatus.id,
                   o.deliveryStatus.name,
                   count(o.id),
                   coalesce(sum(o.totalPrice), 0),
                   coalesce(sum(coalesce(o.collectivePrice, 0) - coalesce(o.deliveryFee, 0)), 0)
            from Order o
            where o.orderCode.users.id = :userId
            group by o.deliveryStatus.id, o.deliveryStatus.name
            """)
    List<Object[]> findStatusAggregatesByUserId(@Param("userId") Integer userId);

    @Query("""
            select coalesce(sum(coalesce(o.collectivePrice, 0) - coalesce(o.deliveryFee, 0)), 0)
            from Order o
            where o.orderCode.users.id = :userId
              and o.createdAt >= :from
              and o.createdAt < :to
            """)
    Double findIncomeByUserIdAndDateRange(@Param("userId") Integer userId,
                                          @Param("from") LocalDateTime from,
                                          @Param("to") LocalDateTime to);

    @Query("""
            select function('date', o.createdAt),
                   count(o.id),
                   coalesce(sum(o.totalPrice), 0),
                   coalesce(sum(o.collectivePrice), 0),
                   coalesce(sum(o.deliveryFee), 0),
                   coalesce(sum(coalesce(o.collectivePrice, 0) - coalesce(o.deliveryFee, 0)), 0)
            from Order o
            where o.orderCode.users.id = :userId
              and o.createdAt >= :from
              and o.createdAt < :to
              and (:applyDeliveryStatusFilter = false or o.deliveryStatus.id in :deliveryStatusIds)
              and (:applyPaymentTypeFilter = false or o.paymentType.id in :paymentTypeIds)
            group by function('date', o.createdAt)
            order by function('date', o.createdAt)
            """)
    List<Object[]> findRevenueOrdersTrend(@Param("userId") Integer userId,
                                          @Param("from") LocalDateTime from,
                                          @Param("to") LocalDateTime to,
                                          @Param("applyDeliveryStatusFilter") Boolean applyDeliveryStatusFilter,
                                          @Param("deliveryStatusIds") List<Integer> deliveryStatusIds,
                                          @Param("applyPaymentTypeFilter") Boolean applyPaymentTypeFilter,
                                          @Param("paymentTypeIds") List<Integer> paymentTypeIds);
}