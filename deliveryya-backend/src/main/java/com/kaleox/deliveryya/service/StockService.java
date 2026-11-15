package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.UpdateStockDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedStockDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public interface StockService {
    ResponseDto<PaginatedStockDto> getStocks(PaginatedStockDto stockDto);

    ResponseDto<Void> updateStocks(@Valid UpdateStockDto updateStockDto);

    ResponseDto<Void> updateStockStatus(@NotNull Integer stockId, @NotNull Boolean isActive);

    String deleteStock(@NotNull @Size(min = 1) List<Integer> stockIds);

    String dropStock(@NotNull @Size(min = 1) List<Integer> stockIds);
}
