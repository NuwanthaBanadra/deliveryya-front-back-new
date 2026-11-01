package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepo extends JpaRepository<Notification, Integer> {
    @Query("select n from Notification n where n.users.id = :userId")
    Page<Notification> findAllByUsersId(@Param("userId") Integer userId, Pageable pageable);

    @Query("select count(n) from Notification n where n.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM notifications WHERE users_id = :userId", nativeQuery = true)
    void deleteByUsersId(@Param("userId") Integer userId);
}