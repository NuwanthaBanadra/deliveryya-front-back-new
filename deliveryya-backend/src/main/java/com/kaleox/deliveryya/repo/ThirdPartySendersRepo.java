package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.ThirdPartySenders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ThirdPartySendersRepo extends JpaRepository<ThirdPartySenders, Integer>, JpaSpecificationExecutor<ThirdPartySenders> {
}

