package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Delivery;
import com.kaleox.deliveryya.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepo extends JpaRepository<Delivery, Integer> {
    List<Delivery> findAllByOrders(Order orders);

    Optional<Delivery> findFirstByOrdersOrderByIdDesc(Order orders);

    List<Delivery> findAllByOrdersOrderByCreatedAtDesc(Order orders);

    @Query("""
            SELECT d
            FROM Delivery d
            LEFT JOIN d.deliveryStatus ds
            LEFT JOIN d.orders.paymentStatus ps
            WHERE d.employees.id = :employeeId
              AND ps.id = 1
              AND (ds IS NULL OR ds.id NOT IN (7, 9))
              AND d.id = (
                    SELECT MAX(d2.id)
                    FROM Delivery d2
                    WHERE d2.orders.id = d.orders.id
              )
            """)
    List<Delivery> findOnHandOrders(@Param("employeeId") Integer employeeId);

    @Query("""
            SELECT d
            FROM Delivery d
            JOIN d.orders o
            JOIN d.deliveryStatus ds
            WHERE d.employees.id = :employeeId
              AND o.paymentStatus.id = 2
              AND o.deliveryStatus.id IN (7, 9)
              AND ds.id IN (7, 9)
            ORDER BY d.createdAt DESC, d.id DESC
            """)
    List<Delivery> findCompletedDeliveryHistory(@Param("employeeId") Integer employeeId);

    @Query("""
            SELECT d
            FROM Delivery d
            JOIN d.orders o
            JOIN d.deliveryStatus ds
            WHERE d.employees.id = :employeeId
              AND ds.id = 7
              AND o.paymentType.id = 1
            """)
    List<Delivery> findEligibleHandoverOrders(@Param("employeeId") Integer employeeId);

    boolean existsByOrders(Order orders);
}
