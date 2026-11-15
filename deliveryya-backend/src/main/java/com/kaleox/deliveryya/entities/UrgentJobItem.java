package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "urgent_job_items")
public class UrgentJobItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "location", nullable = false, length = 100)
    private String location;

    @NotNull
    @Column(name = "task", nullable = false, columnDefinition = "TEXT")
    private String task;

    @Column(name = "be_at")
    private LocalDateTime beAt;

    @Column(name = "expected_time_duration")
    private Integer expectedTimeDuration;

    @Column(name = "spent_duration")
    private Integer spentDuration;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "urgent_jobs_id", nullable = false)
    private UrgentJob urgentJobs;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_status_id", nullable = false)
    private JobStatus jobStatus;


}