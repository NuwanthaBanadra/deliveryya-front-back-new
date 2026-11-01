package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.feedbacks.FeedbackDTO;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedFeedbackDto;

public interface FeedbackService {
    FeedbackDTO saveFeedback(FeedbackDTO feedbackDTO, Integer userId);

    FeedbackDTO updateFeedback(FeedbackDTO feedbackDTO, Integer userId);

    void deleteFeedback(Integer id);

    PaginatedFeedbackDto getFeedbacks(PaginatedFeedbackDto feedbackDTO);
}
