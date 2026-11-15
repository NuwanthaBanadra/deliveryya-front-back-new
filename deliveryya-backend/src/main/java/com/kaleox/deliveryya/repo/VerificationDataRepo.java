package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.VerificationData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationDataRepo extends JpaRepository<VerificationData, Integer> {

    List<VerificationData> findAllByUsers_Id(Integer userId);

    Optional<VerificationData> findByIdAndUsers_Id(Integer id, Integer userId);

    @Query("select count(vd) from VerificationData vd where vd.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM verification_data WHERE users_id = :userId", nativeQuery = true)
    void deleteByUsersId(@Param("userId") Integer userId);
}
