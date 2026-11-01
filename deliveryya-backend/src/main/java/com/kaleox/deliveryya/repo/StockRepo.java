package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Product;
import com.kaleox.deliveryya.entities.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepo extends JpaRepository<Stock, Integer>, JpaSpecificationExecutor<Stock> {
    Optional<Stock> findByProductsAndColorAndCostAndShowingPriceAndSellingPrice(
            Product products, String color, Double cost, Double showingPrice, Double sellingPrice);

    @Query("SELECT m.id FROM Stock s JOIN s.products p JOIN p.category c JOIN c.markets m WHERE s.id = :stockId")
    Optional<Integer> findMarketIdByStockId(@Param("stockId") Integer stockId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM stock WHERE id = :stockId", nativeQuery = true)
    int deleteStockByIdNative(@Param("stockId") Integer stockId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE stock SET is_deleted = true, is_active = false WHERE id = :stockId", nativeQuery = true)
    int softDeleteStockById(@Param("stockId") Integer stockId);

    @Query("""
            select s from Stock s
            where s.products.id in :productIds
              and (s.isDeleted = false or s.isDeleted is null)
            order by s.products.id asc, s.sellingPrice asc, s.id asc
            """)
    List<Stock> findVisibleStocksByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("select count(s) from Stock s where s.products.id = :productId")
    long countByProductsId(@Param("productId") Integer productId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM stock WHERE products_id = :productId", nativeQuery = true)
    void deleteByProductsId(@Param("productId") Integer productId);
}
