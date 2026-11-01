package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepo extends JpaRepository<Feedback, Integer>, JpaSpecificationExecutor<Feedback> {
    Optional<Feedback> findByIdAndUser_Email(Integer id, String email);

    @Query("select f.product.id, avg(f.rating) from Feedback f where f.product.id in :productIds group by f.product.id")
    List<Object[]> findAverageRatingsByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("select avg(f.rating) from Feedback f where f.product.id = :productId")
    Double findAverageRatingByProductId(@Param("productId") Integer productId);

    @Query("select count(f) from Feedback f where f.product.id = :productId")
    long countByProductId(@Param("productId") Integer productId);

    @Query("select count(f) from Feedback f where f.user.id = :userId")
    long countByUserId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM feedbacks WHERE user_id = :userId", nativeQuery = true)
    void deleteByUserId(@Param("userId") Integer userId);
}
