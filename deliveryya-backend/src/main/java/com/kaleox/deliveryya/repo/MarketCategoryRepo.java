package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.MarketCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MarketCategoryRepo extends JpaRepository<MarketCategory, Integer> {
}
