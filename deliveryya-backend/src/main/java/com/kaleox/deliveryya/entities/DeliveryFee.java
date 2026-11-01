package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "delivery_fees")
public class DeliveryFee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cites_id", referencedColumnName = "id", nullable = false)
    private City city;

    @NotNull
    @Column(name = "fee", nullable = false)
    private Double fee;

    @NotNull
    @Column(name = "additional_fee", nullable = false)
    private Double additionalFee = 0.0;


}