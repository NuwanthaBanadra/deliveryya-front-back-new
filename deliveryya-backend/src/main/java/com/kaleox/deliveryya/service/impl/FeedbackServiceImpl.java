package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.feedbacks.FeedbackDTO;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedFeedbackDto;
import com.kaleox.deliveryya.entities.Feedback;
import com.kaleox.deliveryya.entities.Product;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.repo.FeedbackRepo;
import com.kaleox.deliveryya.repo.ProductRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.FeedbackService;
import com.kaleox.deliveryya.service.specification.FeedbackSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepo feedbackRepo;
    private final UserRepo userRepo;
    private final ProductRepo productRepo;

    @Override
    @Transactional
    public FeedbackDTO saveFeedback(FeedbackDTO feedbackDTO, Integer userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        Product product = getProduct(feedbackDTO.getProductId());

        Feedback feedback = Feedback.builder()
                .comment(feedbackDTO.getComment())
                .rating(feedbackDTO.getRating())
                .user(user)
                .product(product)
                .build();

        Feedback savedFeedback = feedbackRepo.save(feedback);
        return mapToDto(savedFeedback);
    }

    @Override
    @Transactional
    public FeedbackDTO updateFeedback(FeedbackDTO feedbackDTO, Integer userId) {
        if (feedbackDTO.getId() == null || feedbackDTO.getId() == 0) {
            throw new BusinessException("Feedback id is required", null);
        }

        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));
        Product product = getProduct(feedbackDTO.getProductId());

        Feedback feedback = feedbackRepo.findByIdAndUser_Email(feedbackDTO.getId(), user.getEmail())
                .orElseThrow(() -> new BusinessException("Feedback not found", null));

        feedback.setComment(feedbackDTO.getComment());
        feedback.setRating(feedbackDTO.getRating());
        feedback.setProduct(product);

        return mapToDto(feedbackRepo.save(feedback));
    }

    @Override
    @Transactional
    public void deleteFeedback(Integer id) {
        if (id == null || id == 0) {
            throw new BusinessException("Feedback id is required", null);
        }

        Feedback feedback = feedbackRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Feedback not found", null));

        feedbackRepo.delete(feedback);
    }

    @Override
    public PaginatedFeedbackDto getFeedbacks(PaginatedFeedbackDto feedbackDTO) {
        Pageable pageable = PageRequest.of(
                feedbackDTO.getPageNumber(),
                feedbackDTO.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<Feedback> spec = FeedbackSpec.getFeedbackSpecification(feedbackDTO);
        Page<Feedback> feedbackPage = feedbackRepo.findAll(spec, pageable);

        feedbackDTO.setTotalCount(feedbackPage.getTotalElements());
        feedbackDTO.setTotalPages(feedbackPage.getTotalPages());
        feedbackDTO.setCountPerPage(feedbackPage.getSize());
        feedbackDTO.setFeedbacks(feedbackPage.getContent().stream()
                .map(this::mapToDto)
                .toList());

        return feedbackDTO;
    }

    private Product getProduct(Integer productId) {
        if (productId == null || productId == 0) {
            throw new BusinessException("Product id is required", null);
        }

        return productRepo.findById(productId)
                .orElseThrow(() -> new BusinessException("Product not found", null));
    }

    private FeedbackDTO mapToDto(Feedback feedback) {
        String userName = null;
        if (feedback.getUser() != null) {
            String firstName = feedback.getUser().getFirstName() == null ? "" : feedback.getUser().getFirstName().trim();
            String lastName = feedback.getUser().getLastName() == null ? "" : feedback.getUser().getLastName().trim();
            String fullName = (firstName + " " + lastName).trim();
            userName = fullName.isEmpty() ? feedback.getUser().getEmail() : fullName;
        }

        return FeedbackDTO.builder()
                .id(feedback.getId())
                .comment(feedback.getComment())
                .rating(feedback.getRating())
                .productId(feedback.getProduct() != null ? feedback.getProduct().getId() : null)
                .userId(feedback.getUser() != null ? feedback.getUser().getId() : null)
                .userName(userName)
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }
}
