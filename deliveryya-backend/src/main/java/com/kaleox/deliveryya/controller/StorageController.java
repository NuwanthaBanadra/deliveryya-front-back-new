package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.utill.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/storage")
public class StorageController {

    private static final Logger logger = LoggerFactory.getLogger(StorageController.class);

    private final FileStorageUtil fileStorageUtil;

    @Value("${app.upload.path}")
    private String uploadPath;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "path", defaultValue = "uploads") String subPath) {
        List<String> publicIds = new ArrayList<>();

        subPath = "temporary/" + LocalDate.now();

        try {
            // Create the directory if it doesn't exist
            Path uploadDirectory = Paths.get(uploadPath, subPath);
            Files.createDirectories(uploadDirectory);

            for (MultipartFile file : files) {
                if (file.isEmpty()) {
                    continue;
                }

                // Generate unique filename
                String originalFilename = file.getOriginalFilename();
                if (!fileStorageUtil.isAllowedDocumentFile(originalFilename, file.getContentType())) {
                    throw new BusinessException("Unsupported file type", Map.of("files", "Allowed formats include images, audio, video, doc, docx, pdf, csv, and other common office files"));
                }

                String fileExtension = "";
                if (originalFilename != null) {
                    int extensionIndex = originalFilename.lastIndexOf(".");
                    if (extensionIndex >= 0) {
                        fileExtension = originalFilename.substring(extensionIndex);
                    }
                }
                String uniqueFilename = UUID.randomUUID() + fileExtension;

                // Create file path
                Path filePath = uploadDirectory.resolve(uniqueFilename);

                // Save file
                Files.write(filePath, file.getBytes());

                // Return relative path as public_id
                String publicId = subPath + "/" + uniqueFilename;
                publicIds.add(publicId);
            }

            return ResponseEntity.ok(ResponseDto.builder()
                    .message("Success")
                    .desc("Files uploaded successfully")
                    .object(publicIds)
                    .build());

        } catch (IOException e) {
            logger.error("Failed to upload files", e);
            throw new BusinessException("Failed to upload files", null);
        }
    }
}
