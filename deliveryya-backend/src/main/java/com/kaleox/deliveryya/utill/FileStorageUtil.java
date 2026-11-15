package com.kaleox.deliveryya.utill;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Utility class for handling file storage operations
 * Manages file deletion from the filesystem
 */
@Component
@Slf4j
public class FileStorageUtil {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of(".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of(".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".mpeg", ".mpg", ".ts");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of(".doc", ".docx", ".pdf", ".csv", ".xls", ".xlsx", ".txt", ".rtf", ".ppt", ".pptx", ".odt");

    @Value("${app.upload.path}")
    private String uploadPath;

    /**
     * Delete a single file from the storage location
     * @param fileReference The stored file reference (e.g., "uploads/products/filename.png")
     * @return true if deletion was successful, false otherwise
     */
    public boolean deleteFile(String fileReference) {
        Optional<Path> resolvedPath = resolveSafePath(fileReference);
        if (resolvedPath.isEmpty()) {
            return false;
        }

        try {
            Path filePath = resolvedPath.get();

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.debug("File deleted successfully: {}", fileReference);
                return true;
            } else {
                log.debug("File not found for deletion: {}", fileReference);
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to delete file: {}", fileReference, e);
            return false;
        }
    }

    /**
     * Delete multiple files from the storage location
     * @param fileReferences List of stored file references to delete
     * @return the number of files successfully deleted
     */
    public int deleteFiles(List<String> fileReferences) {
        if (fileReferences == null || fileReferences.isEmpty()) {
            return 0;
        }

        int deletedCount = 0;
        for (String fileReference : fileReferences) {
            if (deleteFile(fileReference)) {
                deletedCount++;
            }
        }
        return deletedCount;
    }

    /**
     * Move a file from temporary location to final destination
     * @param fileReference The temporary file reference (e.g., "temporary/2026-04-28/uuid.png")
     * @param destinationPath The destination directory (e.g., "products", "users", "market", "payment-profes")
     * @return The new file reference if successful, null otherwise
     */
    public String moveFile(String fileReference, String destinationPath) {
        if (fileReference == null || fileReference.trim().isEmpty() || destinationPath == null || destinationPath.trim().isEmpty()) {
            return null;
        }

        try {
            Optional<Path> sourcePath = resolveSafePath(fileReference);
            if (sourcePath.isEmpty()) {
                log.warn("Source file not found: {}", fileReference);
                return null;
            }

            Path sourceFile = sourcePath.get();
            if (!Files.exists(sourceFile)) {
                log.warn("Source file does not exist: {}", fileReference);
                return null;
            }

            // Get filename from source
            String filename = sourceFile.getFileName().toString();

            // Create destination directory
            Path root = Paths.get(uploadPath).toAbsolutePath().normalize();
            String cleanDestination = destinationPath.trim().replace("\\", "/");
            Path destDirectory = root.resolve(cleanDestination).normalize();

            // Validate destination is within upload path
            if (!destDirectory.startsWith(root)) {
                log.warn("Attempted to move file outside upload directory: {}", destinationPath);
                return null;
            }

            Files.createDirectories(destDirectory);

            // Move the file
            Path destFile = destDirectory.resolve(filename);
            Files.move(sourceFile, destFile);

            // Return the relative path as reference
            String relativeReference = cleanDestination + "/" + filename;
            log.debug("File moved successfully from {} to {}", fileReference, relativeReference);
            return relativeReference;
        } catch (Exception e) {
            log.error("Failed to move file from {} to {}", fileReference, destinationPath, e);
            return null;
        }
    }

    public String normalizeFileReference(String fileReference) {
        return normalizeRelativePath(fileReference).orElse(null);
    }

    /**
     * Check if a file is an image based on its extension
     * @param filename The filename to check
     * @return true if the file is an image (jpg, jpeg, png, gif, webp), false otherwise
     */
    public boolean isImageFile(String filename) {
        return hasAllowedExtension(filename, IMAGE_EXTENSIONS);
    }

    public boolean isAllowedDocumentFile(String filename) {
        return hasAllowedExtension(filename, IMAGE_EXTENSIONS)
                || hasAllowedExtension(filename, AUDIO_EXTENSIONS)
                || hasAllowedExtension(filename, VIDEO_EXTENSIONS)
                || hasAllowedExtension(filename, DOCUMENT_EXTENSIONS);
    }

    public boolean isAllowedDocumentFile(String filename, String contentType) {
        if (isAllowedDocumentFile(filename)) {
            return true;
        }

        if (contentType == null || contentType.trim().isEmpty()) {
            return false;
        }

        String lowerContentType = contentType.toLowerCase(Locale.ROOT);
        return lowerContentType.startsWith("image/")
                || lowerContentType.startsWith("audio/")
                || lowerContentType.startsWith("video/")
                || lowerContentType.equals("application/pdf")
                || lowerContentType.equals("text/csv")
                || lowerContentType.equals("text/plain")
                || lowerContentType.equals("application/msword")
                || lowerContentType.equals("application/rtf")
                || lowerContentType.equals("application/vnd.ms-excel")
                || lowerContentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                || lowerContentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                || lowerContentType.equals("application/vnd.openxmlformats-officedocument.presentationml.presentation")
                || lowerContentType.equals("application/vnd.oasis.opendocument.text");
    }

    private Optional<Path> resolveSafePath(String fileReference) {
        try {
            Optional<String> normalizedReference = normalizeRelativePath(fileReference);
            if (normalizedReference.isEmpty()) {
                return Optional.empty();
            }

            Path root = Paths.get(uploadPath).toAbsolutePath().normalize();
            Path candidate = root.resolve(normalizedReference.get()).normalize();

            if (!candidate.startsWith(root)) {
                log.warn("Attempted to access file outside upload directory: {}", fileReference);
                return Optional.empty();
            }

            return Optional.of(candidate);
        } catch (Exception e) {
            log.warn("Invalid file reference for deletion: {}", fileReference, e);
            return Optional.empty();
        }
    }

    private Optional<String> normalizeRelativePath(String fileReference) {
        try {
            if (fileReference == null || fileReference.trim().isEmpty()) {
                return Optional.empty();
            }

            String normalized = fileReference.trim().replace('\\', '/');

            if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
                normalized = URI.create(normalized).getPath();
            }

            int queryIndex = normalized.indexOf('?');
            if (queryIndex >= 0) {
                normalized = normalized.substring(0, queryIndex);
            }

            if (normalized.startsWith("/")) {
                normalized = normalized.substring(1);
            }

            String lower = normalized.toLowerCase(Locale.ROOT);
            if (lower.startsWith("static/")) {
                normalized = normalized.substring("static/".length());
                lower = normalized.toLowerCase(Locale.ROOT);
            }

            if (lower.startsWith("uploads/")) {
                normalized = normalized.substring("uploads/".length());
            }

            return normalized.isBlank() ? Optional.empty() : Optional.of(normalized);
        } catch (Exception e) {
            log.warn("Invalid file reference for deletion: {}", fileReference, e);
            return Optional.empty();
        }
    }

    private boolean hasAllowedExtension(String filename, Set<String> allowedExtensions) {
        if (filename == null || filename.trim().isEmpty()) {
            return false;
        }

        String lowerName = filename.toLowerCase(Locale.ROOT);
        return allowedExtensions.stream().anyMatch(lowerName::endsWith);
    }
}



