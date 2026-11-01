package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SizeRepo extends JpaRepository<Size, Integer> {
    List<Size> findAllByMarketsIdOrderByNameAsc(Integer marketId);

    boolean existsByMarketsIdAndNameIgnoreCase(Integer marketId, String name);

    boolean existsByMarketsIdAndNameIgnoreCaseAndIdNot(Integer marketId, String name, Integer id);
}
