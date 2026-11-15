package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "market_orders")
public class MarketOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @DecimalMin("0.0")
    @Column(name = "qty", nullable = false)
    private Double qty;

    @NotNull
    @DecimalMin("0.0")
    @Column(name = "price", nullable = false)
    private Double price;

    @NotNull
    @DecimalMin("0.0")
    @Column(name = "discount", nullable = false)
    private Double discount;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "users_id", nullable = false)
    private User user;
}
