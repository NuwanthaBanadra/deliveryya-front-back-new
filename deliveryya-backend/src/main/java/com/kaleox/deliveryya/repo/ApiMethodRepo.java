package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.ApiMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiMethodRepo extends JpaRepository<ApiMethod, Integer> {
}

