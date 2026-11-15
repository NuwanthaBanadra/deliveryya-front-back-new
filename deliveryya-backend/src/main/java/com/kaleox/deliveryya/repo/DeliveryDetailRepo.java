package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.DeliveryDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeliveryDetailRepo extends JpaRepository<DeliveryDetail, Integer> {
    List<DeliveryDetail> findDeliveryDetailByUsers_Id(Integer usersId);

    List<DeliveryDetail> findDeliveryDetailByUsers_IdAndPermanent(Integer usersId, Boolean permanent);

    long countByUsers_Id(Integer usersId);

    Optional<DeliveryDetail> findByIdAndUsers_Id(Integer id, Integer usersId);

    @Query("select count(dd) from DeliveryDetail dd where dd.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM delivery_details WHERE users_id = :userId", nativeQuery = true)
    void deleteByUsersId(@Param("userId") Integer userId);
}