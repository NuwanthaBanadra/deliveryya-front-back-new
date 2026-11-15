package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.BankDetailDto;
import com.kaleox.deliveryya.dto.MarketDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SendOtpDto;
import com.kaleox.deliveryya.dto.UpdateMarketStatusInfoDto;
import com.kaleox.deliveryya.dto.VerifyOtpDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBankDetailDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedMarketDto;
import com.kaleox.deliveryya.service.MarketService;
import com.kaleox.deliveryya.service.OtpService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/markets")
public class MarketController {

    private final MarketService marketService;
    private final OtpService otpService;

    @PostMapping("/get-markets")
    public ResponseEntity<ResponseDto<PaginatedMarketDto>> getMarkets(@RequestBody @Valid PaginatedMarketDto paginatedMarketDto, @AuthenticationPrincipal UserDetails userDetails) {

//        if (paginatedMarketDto.getUserId() == null || paginatedMarketDto.getUserId() == 0) {
//            paginatedMarketDto.setUserId(Integer.parseInt(userDetails.getUsername()));
//        }
        return ResponseEntity.ok(ResponseDto.<PaginatedMarketDto>builder().message("Success").desc("Markets fetched successfully.")
                .object(marketService.getMarkets(paginatedMarketDto)).build());
    }

    @PostMapping("/set-market")
    public ResponseEntity<ResponseDto<MarketDto>> setMarket(@RequestBody @Valid MarketDto marketDto, @AuthenticationPrincipal UserDetails userDetails) {

        if (marketDto.getUsers().getId() == null || marketDto.getUsers().getId() == 0) {
            marketDto.getUsers().setId(Integer.parseInt(userDetails.getUsername()));
        }
        return ResponseEntity.ok(ResponseDto.<MarketDto>builder().message("Success").desc("Market successfully created.").object(marketService.setMarkets(marketDto)).build());
    }

    @PostMapping("/update-market")
    public ResponseEntity<ResponseDto<MarketDto>> updateMarket(@RequestBody @Valid MarketDto marketDto, @AuthenticationPrincipal UserDetails userDetails) {

        if (marketDto.getUsers().getId() == null || marketDto.getUsers().getId() == 0) {
            marketDto.getUsers().setId(Integer.parseInt(userDetails.getUsername()));
        }
        return ResponseEntity.ok(ResponseDto.<MarketDto>builder().message("Success").desc("Market successfully updated and marked as inactive.").object(marketService.updateMarket(marketDto)).build());
    }

    @PostMapping("/update-market-status-info")
    public ResponseEntity<ResponseDto<MarketDto>> updateMarketStatusInfo(@RequestBody @Valid UpdateMarketStatusInfoDto updateMarketStatusInfoDto) {

        return ResponseEntity.ok(ResponseDto.<MarketDto>builder().message("Success").desc("Market status/info updated successfully.").object(marketService.updateMarketStatusInfo(updateMarketStatusInfoDto)).build());
    }

    @DeleteMapping("/delete-market")
    public ResponseEntity<ResponseDto<Void>> deleteMarket(@RequestParam @NotNull(message = "Market id must be provided") Integer marketId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder().message("Success").desc(marketService.deleteMarket(marketId)).build());
    }

    @GetMapping("/get-market-categories")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getMarketCategories(@RequestParam(required = false) Integer id) {

        return ResponseEntity.ok(ResponseDto.<List<CommonIdNameDto>>builder().message("Success").desc("Market categories fetched successfully").object(marketService.getMarketCategories(id)).build());
    }

    @PostMapping("/set-bank-detail")
    public ResponseEntity<ResponseDto<Void>> setBankDetail(@RequestBody @Valid BankDetailDto bankDetailDto, @AuthenticationPrincipal UserDetails userDetails) {

        marketService.setBankDetail(bankDetailDto);
        return ResponseEntity.ok(ResponseDto.<Void>builder().message("Success").desc("Bank detail successfully created.").build());
    }

    @PostMapping("/update-bank-detail")
    public ResponseEntity<ResponseDto<Void>> updateBankDetail(@RequestBody @Valid BankDetailDto bankDetailDto, @AuthenticationPrincipal UserDetails userDetails) {

        if (bankDetailDto.getId() == null || bankDetailDto.getId() == 0) {
            throw new BusinessException("Bank Detail Id must be provided for update", null);
        }

        marketService.updateBankDetail(bankDetailDto);
        return ResponseEntity.ok(ResponseDto.<Void>builder().message("Success").desc("Bank detail successfully updated.").build());
    }

    @DeleteMapping("/delete-bank-detail")
    public ResponseEntity<ResponseDto<Void>> deleteBankDetail(@RequestParam @NotNull(message = "Bank detail id must be provided") Integer bankDetailId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder().message("Success").desc(marketService.deleteBankDetail(bankDetailId)).build());
    }

    @PutMapping("/update-bank-detail-status")
    public ResponseEntity<ResponseDto<Void>> updateBankDetailStatus(@RequestParam @NotNull(message = "Bank detail id must be provided") Integer bankDetailId, @RequestParam @NotNull(message = "isActive must be provided") Boolean isActive) {
        return ResponseEntity.ok(ResponseDto.<Void>builder().message("Success").desc(marketService.updateBankDetailStatus(bankDetailId, isActive)).build());
    }

    @PostMapping("/get-bank-details")
    public ResponseEntity<ResponseDto<PaginatedBankDetailDto>> getBankDetails(@RequestBody @Valid PaginatedBankDetailDto paginatedBankDetailDto) {

        return ResponseEntity.ok(ResponseDto.<PaginatedBankDetailDto>builder().message("Success").desc("Bank details fetched successfully.")
                .object(marketService.getBankDetails(paginatedBankDetailDto)).build());
    }

    @GetMapping("/get-bank-details-by-user-id")
    public ResponseEntity<ResponseDto<List<BankDetailDto>>> getBankDetailsByUserId(@RequestParam(required = false) Integer userId,
                                                                                   @RequestParam(required = false, defaultValue = "true") Boolean isActive) {

//        return ResponseEntity.ok(ResponseDto.<List<BankDetailDto>>builder().message("Success")
//                .desc("Bank details fetched successfully.").object(marketService.getBankDetailsByUser(userId, isActive)).build());
        PaginatedBankDetailDto dto = marketService.getBankDetails(PaginatedBankDetailDto.builder()
                .pageNumber(0)
                .countPerPage(10)
                .userId(userId)
                .isActive(isActive)
                .build());

        return ResponseEntity.ok(ResponseDto.<List<BankDetailDto>>builder()
                .message("Success")
                .desc("Bank details fetched successfully.")
                .object((List<BankDetailDto>) dto.getItems())
                .build());
    }

//    @GetMapping("/get-bank-details-by-user-id-and-bank-detail-id")
//    public ResponseEntity<ResponseDto<List<BankDetailDto>>> getBankDetailsByUserIdAndBankDetailId(@RequestParam(required = false) Integer userId, @RequestParam(required = false) Integer bankDetailId, @RequestParam(required = false) Boolean isActive) {
//
//        return ResponseEntity.ok(ResponseDto.<List<BankDetailDto>>builder().message("Success").desc("Bank details fetched successfully.").object(marketService.getBankDetailsByUserIdAndBankDetailId(userId, bankDetailId, isActive)).build());
//    }
//
//    @PostMapping("/get-bank-details-by-user-id-and-bank-detail-id-paginated")
//    public ResponseEntity<ResponseDto<PaginatedBankDetailDto>> getBankDetailsByUserIdAndBankDetailIdPaginated(@RequestBody @Valid PaginatedBankDetailDto paginatedBankDetailDto) {
//
//        return ResponseEntity.ok(ResponseDto.<PaginatedBankDetailDto>builder().message("Success").desc("Bank details fetched successfully.").object(marketService.getBankDetailsByUserIdAndBankDetailIdPaginated(paginatedBankDetailDto)).build());
//    }


    @GetMapping("/get-banks")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getBanks(@AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(ResponseDto.<List<CommonIdNameDto>>builder().message("Success").desc("Banks fetched successfully.").object(marketService.getBanks()).build());
    }

    @GetMapping("/get-markets-details-by-market-order-id")
    public ResponseEntity<ResponseDto<MarketDto>> getMarketsDetailsByMarketOrderId(@RequestParam @NotNull(message = "Market Order Id must be provided") Integer marketOrderId) {

        return ResponseEntity.ok(ResponseDto.<MarketDto>builder().message("Success").desc("Market details fetched successfully").object(marketService.getMarketsDetailsByMarketOrderId(marketOrderId)).build());
    }

    @PostMapping("/send-otp-bank-detail")
    public ResponseEntity<ResponseDto<Void>> sendOtpForBankDetail(@RequestBody @Valid SendOtpDto sendOtpDto) {
        ResponseDto<Void> response = otpService.sendOtpForBankDetail(sendOtpDto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp-bank-detail")
    public ResponseEntity<ResponseDto<Void>> verifyOtpForBankDetail(@RequestBody @Valid VerifyOtpDto verifyOtpDto) {
        ResponseDto<Void> response = otpService.verifyOtpForBankDetail(verifyOtpDto);
        return ResponseEntity.ok(response);
    }

}
