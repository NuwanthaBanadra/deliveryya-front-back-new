package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductRepo extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    Optional<Product> findByCode(String code);

    Optional<Product> findByName(String name);

    @Query("select count(p) from Product p where p.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") Integer categoryId);

    @Query("select count(p) from Product p where p.brand.id = :brandId")
    long countByBrandId(@Param("brandId") Integer brandId);
}
