package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRoleRepo extends JpaRepository<UserRole, Integer> {

    Optional<UserRole> findByName(String name);
}
