package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.MarketOrder;
import com.kaleox.deliveryya.entities.MarketOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketOrderItemRepo extends JpaRepository<MarketOrderItem, Integer> {
    void deleteAllByMarketOrder(MarketOrder marketOrder);

    List<MarketOrderItem> findAllByMarketOrder(MarketOrder marketOrder);

    @Query("""
            select moi.stock.products.id, coalesce(sum(moi.qty), 0)
            from MarketOrderItem moi
            where moi.stock.products.id in :productIds
            group by moi.stock.products.id
            """)
    List<Object[]> findTotalSoldQtyByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("""
            select moi.stock.products.id, count(distinct moi.marketOrder.id)
            from MarketOrderItem moi
            where moi.stock.products.id in :productIds
            group by moi.stock.products.id
            """)
    List<Object[]> findMarketOrderCountsByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("select count(moi) from MarketOrderItem moi where moi.stock.products.id = :productId")
    long countByStockProductId(@Param("productId") Integer productId);
}
