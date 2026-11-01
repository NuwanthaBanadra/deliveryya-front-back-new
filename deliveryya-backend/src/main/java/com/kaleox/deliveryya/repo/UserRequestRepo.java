package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UserRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRequestRepo extends JpaRepository<UserRequest, Integer>, JpaSpecificationExecutor<UserRequest> {

    Optional<UserRequest> findByIdAndIsDeletedFalse(Integer id);

    @Query("select count(ur) from UserRequest ur where ur.user.id = :userId")
    long countByUserId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM user_requests WHERE user_id = :userId", nativeQuery = true)
    void deleteByUserId(@Param("userId") Integer userId);
}

