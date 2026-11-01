package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.BankDetailDto;
import com.kaleox.deliveryya.dto.MarketDto;
import com.kaleox.deliveryya.dto.UpdateMarketStatusInfoDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBankDetailDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedMarketDto;
import jakarta.validation.Valid;

import java.util.List;

public interface MarketService {
    PaginatedMarketDto getMarkets(PaginatedMarketDto paginatedMarketDto);

    MarketDto setMarkets(@Valid MarketDto marketDto);

    MarketDto updateMarket(@Valid MarketDto marketDto);

    MarketDto updateMarketStatusInfo(@Valid UpdateMarketStatusInfoDto updateMarketStatusInfoDto);

    String deleteMarket(Integer marketId);

    void setBankDetail(@Valid BankDetailDto bankDetailDto);

    void updateBankDetail(@Valid BankDetailDto bankDetailDto);

    String deleteBankDetail(Integer bankDetailId);

    String updateBankDetailStatus(Integer bankDetailId, Boolean isActive);

    PaginatedBankDetailDto getBankDetails(PaginatedBankDetailDto paginatedBankDetailDto);

    List<BankDetailDto> getBankDetailsByUser(Integer userId, Boolean isActive);

    List<BankDetailDto> getBankDetailsByUserIdAndBankDetailId(Integer userId, Integer bankDetailId, Boolean isActive);

    PaginatedBankDetailDto getBankDetailsByUserIdAndBankDetailIdPaginated(PaginatedBankDetailDto paginatedBankDetailDto);

    List<CommonIdNameDto> getBanks();

    MarketDto getMarketsDetailsByMarketOrderId(Integer marketOrderId);

    List<CommonIdNameDto> getMarketCategories(Integer id);
}
