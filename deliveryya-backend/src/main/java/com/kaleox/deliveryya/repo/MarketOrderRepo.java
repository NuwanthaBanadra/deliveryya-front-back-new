package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.MarketOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketOrderRepo extends JpaRepository<MarketOrder, Integer> {
    @Query("""
            select mo.user.id, count(mo.id)
            from MarketOrder mo
            where mo.user.id in :userIds
            group by mo.user.id
            """)
    List<Object[]> countMarketOrdersByUserIds(@Param("userIds") List<Integer> userIds);

    @Query("select count(mo) from MarketOrder mo where mo.user.id = :userId")
    long countByUserId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM market_orders WHERE users_id = :userId", nativeQuery = true)
    void deleteByUserId(@Param("userId") Integer userId);
}
