package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.feedbacks.FeedbackDTO;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedFeedbackDto;
import com.kaleox.deliveryya.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
public class    FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/set-feedback")
    public ResponseEntity<ResponseDto<FeedbackDTO>> saveFeedback(@RequestBody @Valid FeedbackDTO feedbackDTO, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<FeedbackDTO>builder()
                .message("Success")
                .desc("Feedback saved successfully")
                .object(feedbackService.saveFeedback(feedbackDTO, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PutMapping("/update-feedback")
    public ResponseEntity<ResponseDto<FeedbackDTO>> updateFeedback(@RequestBody @Valid FeedbackDTO feedbackDTO, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<FeedbackDTO>builder()
                .message("Success")
                .desc("Feedback updated successfully")
                .object(feedbackService.updateFeedback(feedbackDTO, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PostMapping("/get-feedbacks")
    public ResponseEntity<ResponseDto<PaginatedFeedbackDto>> getFeedbacksByProductId(@RequestBody @Valid PaginatedFeedbackDto feedbackDTO, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<PaginatedFeedbackDto>builder()
                .message("Success")
                .desc("Feedbacks retrieved successfully")
                .object(feedbackService.getFeedbacks(feedbackDTO))
                .build());
    }

    @DeleteMapping("/delete-feedback")
    public ResponseEntity<ResponseDto<Void>> deleteFeedback(@RequestParam Integer id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc("Feedback deleted successfully")
                .build());
    }
}
