package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "stock")
public class Stock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "cost")
    private Double cost;

    @Column(name = "showing_price")
    private Double showingPrice;

    @NotNull
    @Column(name = "selling_price", nullable = false)
    private Double sellingPrice;

    @NotNull
    @Column(name = "qty", nullable = false)
    private Double qty;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "products_id", nullable = false)
    private Product products;

    @jakarta.validation.constraints.Size(max = 45)
    @Column(name = "emi", length = 45)
    private String emi;

    @jakarta.validation.constraints.Size(max = 10)
    @NotNull
    @Column(name = "color", nullable = false, length = 10)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sizes_id")
    private Size sizes;

    @NotNull
    @Column(name = "wpu", nullable = false)
    private Double wpu;

    @Builder.Default
    @ColumnDefault("b'0'")
    @Column(name = "is_active", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isActive = false;


    @NotNull
    @ColumnDefault("b'0'")
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

}
