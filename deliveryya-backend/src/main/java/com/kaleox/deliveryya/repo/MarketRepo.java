package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Market;
import com.kaleox.deliveryya.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarketRepo extends JpaRepository<Market, Integer>, JpaSpecificationExecutor<Market> {
    Optional<Market> getMarketByUsers(User users);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM markets WHERE id = :marketId", nativeQuery = true)
    int deleteMarketByIdNative(@Param("marketId") Integer marketId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE markets SET is_deleted = true, is_active = false WHERE id = :marketId", nativeQuery = true)
    int softDeleteMarketById(@Param("marketId") Integer marketId);

    @Query("select count(m) from Market m where m.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);
}
