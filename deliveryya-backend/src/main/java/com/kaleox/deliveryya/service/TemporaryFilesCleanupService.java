package com.kaleox.deliveryya.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.stream.Stream;

/**
 * Service for cleaning up temporary uploaded files
 * Deletes folders that are older than 2 days
 * Runs on application startup and once per day at midnight
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TemporaryFilesCleanupService {

    @Value("${app.upload.path}")
    private String uploadPath;

    /**
     * Run cleanup on application startup
     */
    @EventListener(ApplicationReadyEvent.class)
    public void cleanupOnStartup() {
        log.info("Starting temporary files cleanup on application startup");
        performCleanup();
    }

    /**
     * Run cleanup once per day at midnight (00:00:00)
     * Using cron expression: "0 0 0 * * *" means every day at 00:00:00
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void cleanupScheduled() {
        log.info("Running scheduled temporary files cleanup");
        performCleanup();
    }

    /**
     * Perform the actual cleanup of old temporary files
     */
    private void performCleanup() {
        try {
            Path temporaryPath = Paths.get(uploadPath, "temporary");

            if (!Files.exists(temporaryPath)) {
                log.debug("Temporary files directory does not exist: {}", temporaryPath);
                return;
            }

            LocalDate cutoffDate = LocalDate.now().minusDays(2);
            log.debug("Cleaning up temporary files older than: {}", cutoffDate);

            try (Stream<Path> stream = Files.list(temporaryPath)) {
                stream.filter(Files::isDirectory)
                        .forEach(dateFolder -> {
                            String folderName = dateFolder.getFileName().toString();
                            try {
                                LocalDate folderDate = LocalDate.parse(folderName);
                                if (folderDate.isBefore(cutoffDate)) {
                                    deleteDirectory(dateFolder);
                                    log.info("Deleted temporary folder: {} (date: {})", folderName, folderDate);
                                }
                            } catch (Exception e) {
                                log.warn("Could not parse folder name as date or delete folder: {}", folderName, e);
                            }
                        });
            }

            log.debug("Temporary files cleanup completed successfully");
        } catch (IOException e) {
            log.error("Error during temporary files cleanup", e);
        }
    }

    /**
     * Recursively delete a directory and all its contents
     * @param directory The directory path to delete
     * @throws IOException if an I/O error occurs
     */
    private void deleteDirectory(Path directory) throws IOException {
        if (!Files.exists(directory)) {
            return;
        }

        try (Stream<Path> stream = Files.walk(directory)) {
            stream.sorted(Comparator.reverseOrder())  // Delete files before directories
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete file: {}", path, e);
                        }
                    });
        }
    }
}



