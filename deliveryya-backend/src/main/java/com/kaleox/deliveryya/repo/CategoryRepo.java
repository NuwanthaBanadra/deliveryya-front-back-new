package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepo extends JpaRepository<Category, Integer>, JpaSpecificationExecutor<Category> {
}
