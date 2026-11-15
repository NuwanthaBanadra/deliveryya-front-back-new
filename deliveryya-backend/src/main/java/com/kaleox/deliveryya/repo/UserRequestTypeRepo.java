package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UserRequestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRequestTypeRepo extends JpaRepository<UserRequestType, Integer> {
}

