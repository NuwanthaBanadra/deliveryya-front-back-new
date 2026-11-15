package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Product;
import com.kaleox.deliveryya.entities.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImagesRepo extends JpaRepository<ProductImage, Integer> {
    void deleteAllByProducts(Product products);
    List<ProductImage> findAllByProducts(Product products);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM product_images WHERE products_id = :productId", nativeQuery = true)
    void deleteAllByProductsId(@Param("productId") Integer productId);
}
