package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.UpdateStockDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedStockDto;
import com.kaleox.deliveryya.service.StockService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/stocks")
public class StockController {

    private final StockService stockService;

    @PostMapping("/get-stocks")
    public ResponseEntity<ResponseDto<PaginatedStockDto>> getStocks(@RequestBody @Valid PaginatedStockDto paginatedStockDto) {


        return ResponseEntity.ok(stockService.getStocks(paginatedStockDto));
    }

    @PostMapping("/update-stock")
    public ResponseEntity<ResponseDto<Void>> updateStock(@RequestBody @Valid UpdateStockDto updateStockDto) {
        // Implementation for updating stock would go here
        return ResponseEntity.ok(stockService.updateStocks(updateStockDto));
    }

    @PutMapping("/update-stock-status")
    public ResponseEntity<ResponseDto<Void>> updateStockStatus(@RequestParam @NotNull(message = "Stock Id must be provided") Integer stockId,
                                                               @RequestParam @NotNull(message = "isActive must be provided") Boolean isActive) {
        return ResponseEntity.ok(stockService.updateStockStatus(stockId, isActive));
    }

    @DeleteMapping("/delete-stock")
    public ResponseEntity<ResponseDto<Void>> deleteStock(@RequestParam @NotNull @Size(min = 1) List<Integer> stockIds) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(stockService.deleteStock(stockIds))
                .build());
    }

    @DeleteMapping("/drop-stock")
    public ResponseEntity<ResponseDto<Void>> dropStock(@RequestParam @NotNull @Size(min = 1) List<Integer> stockIds) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(stockService.deleteStock(stockIds))
                .build());
    }

}
