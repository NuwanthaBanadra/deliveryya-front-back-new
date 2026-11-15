package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDiscountDto;
import com.kaleox.deliveryya.entities.City;
import com.kaleox.deliveryya.entities.Discount;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.repo.CityRepo;
import com.kaleox.deliveryya.repo.DiscountRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.specification.DiscountSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiscountService {

    private final DiscountRepo discountRepo;
    private final UserRepo userRepo;
    private final CityRepo cityRepo;

    @Transactional
    public ResponseDto<Void> createDiscounts(CreateDiscountDto dto) {
        // Validate user exists
        User user = userRepo.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException("User not found", 
                        Map.of("userId", "User with id " + dto.getUserId() + " not found")));

        List<Discount> discounts = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (Integer cityId : dto.getCityIds()) {
            // Check if discount already exists for this user and city
            if (discountRepo.findByUserIdAndCityId(dto.getUserId(), cityId).isPresent()) {
                errors.add("Discount already exists for city id " + cityId);
                continue;
            }

            City city = cityRepo.findById(cityId)
                    .orElseThrow(() -> new BusinessException("City not found", 
                            Map.of("cityId", "City with id " + cityId + " not found")));

            Discount discount = Discount.builder()
                    .user(user)
                    .city(city)
                    .discount(dto.getDiscount())
                    .build();

            discounts.add(discount);
        }

        if (!discounts.isEmpty()) {
            discountRepo.saveAll(discounts);
        }

        String message = discounts.isEmpty() ? "No discounts created" : 
                "Successfully created " + discounts.size() + " discount(s)";
        
        if (!errors.isEmpty()) {
            return ResponseDto.<Void>builder()
                    .status(207) // Multi-status
                    .message("Partial success")
                    .desc(message + ". " + String.join(", ", errors))
                    .build();
        }

        return ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc(message)
                .build();
    }

    public ResponseDto<List<DiscountDto>> getDiscountsByUserId(Integer userId) {
        // Validate user exists
        userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found",
                        Map.of("userId", "User with id " + userId + " not found")));

        List<Discount> discounts = discountRepo.findByUserId(userId);
        System.out.println("Fetching discounts for userId: " + userId + ", found: " + discounts.size() + " discounts");
        for (Discount discount : discounts) {
            System.out.println("Discount ID: " + discount.getId() + ", User ID: " + discount.getUser().getId() + ", City ID: " + discount.getCity().getId());
        }

        List<DiscountDto> discountDtos = discounts.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return ResponseDto.<List<DiscountDto>>builder()
                .status(200)
                .message("Success")
                .desc("Discounts fetched successfully")
                .object(discountDtos)
                .build();
    }

    @Transactional
    public ResponseDto<Void> deleteDiscount(Integer userId, Integer cityId) {
        Discount discount = discountRepo.findByUserIdAndCityId(userId, cityId)
                .orElseThrow(() -> new BusinessException("Discount not found", 
                        Map.of("discount", "Discount for user " + userId + " and city " + cityId + " not found")));

        discountRepo.delete(discount);

        return ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc("Discount deleted successfully")
                .build();
    }

    @Transactional
    public ResponseDto<Void> updateDiscount(Integer userId, Integer cityId, Double newDiscount) {
        Discount discount = discountRepo.findByUserIdAndCityId(userId, cityId)
                .orElseThrow(() -> new BusinessException("Discount not found", 
                        Map.of("discount", "Discount for user " + userId + " and city " + cityId + " not found")));

        discount.setDiscount(newDiscount);
        discountRepo.save(discount);

        return ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc("Discount updated successfully")
                .build();
    }

    private DiscountDto convertToDto(Discount discount) {
        return DiscountDto.builder()
                .id(discount.getId())
                .user(convertUserToDto(discount.getUser()))
                .city(convertCityToDto(discount.getCity()))
                .discount(discount.getDiscount())
                .build();
    }

    private com.kaleox.deliveryya.dto.user.UserDto convertUserToDto(User user) {
        return com.kaleox.deliveryya.dto.user.UserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .build();
    }

    private CityDto convertCityToDto(City city) {
        return CityDto.builder()
                .id(city.getId())
                .name(city.getName())
                .district(convertDistrictToDto(city.getDistrict()))
                .build();
    }

    private DistrictDto convertDistrictToDto(com.kaleox.deliveryya.entities.District district) {
        return DistrictDto.builder()
                .id(district.getId())
                .name(district.getName())
                .build();
    }

    public ResponseDto<PaginatedDiscountDto> getUsersWithDiscounts(PaginatedDiscountDto paginatedDiscountDto) {
        Pageable pageable = PageRequest.of(
            paginatedDiscountDto.getPageNumber(),
            paginatedDiscountDto.getCountPerPage(),
            Sort.by("id").ascending()
        );

        Specification<Discount> spec = DiscountSpec.getDiscountSpecification(paginatedDiscountDto);

        Page<Discount> discounts = discountRepo.findAll(spec, pageable);

        paginatedDiscountDto.setTotalCount(discounts.getTotalElements());
        paginatedDiscountDto.setTotalPages(discounts.getTotalPages());
        paginatedDiscountDto.setCountPerPage(discounts.getSize());

        List<DiscountDto> discountDtoList = discounts.getContent().stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());

        paginatedDiscountDto.setItems(discountDtoList);

        return ResponseDto.<PaginatedDiscountDto>builder()
            .status(200)
            .message("Success")
            .desc("Users with discounts fetched successfully")
            .object(paginatedDiscountDto)
            .build();
    }
}
