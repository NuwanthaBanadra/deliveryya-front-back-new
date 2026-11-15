package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.order.ThirdPartySendersDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedThirdPartySendersDto;
import com.kaleox.deliveryya.entities.ThirdPartySenders;
import com.kaleox.deliveryya.repo.OrderRepo;
import com.kaleox.deliveryya.repo.ThirdPartySendersRepo;
import com.kaleox.deliveryya.service.ThirdPartySendersService;
import com.kaleox.deliveryya.service.specification.ThirdPartySendersSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ThirdPartySendersServiceImpl implements ThirdPartySendersService {

    private final ThirdPartySendersRepo thirdPartySendersRepo;
    private final OrderRepo orderRepo;

    @Override
    public PaginatedThirdPartySendersDto getThirdPartySenders(PaginatedThirdPartySendersDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").descending());
        Specification<ThirdPartySenders> spec = ThirdPartySendersSpec.getThirdPartySendersSpecification(dto);

        Page<ThirdPartySenders> senders = thirdPartySendersRepo.findAll(spec, pageable);

        dto.setTotalCount(senders.getTotalElements());
        dto.setTotalPages(senders.getTotalPages());
        dto.setCountPerPage(senders.getSize());

        List<ThirdPartySendersDto> items = senders.getContent().stream()
                .map(sender -> new ThirdPartySendersDto(
                        sender.getId(),
                        sender.getName(),
                        sender.getAddress(),
                        sender.getNote(),
                        sender.getNic(),
                        sender.getFirst_mob(),
                        sender.getSec_mob(),
                        sender.getWhatsapp(),
                        sender.getCreatedAt(),
                        sender.getUpdatedAt(),
                        sender.getCreatedBy(),
                        sender.getUpdatedBy()
                ))
                .toList();

        dto.setItems(items);
        return dto;
    }

    @Override
    @Transactional
    public ResponseDto<ThirdPartySendersDto> updateThirdPartySender(ThirdPartySendersDto dto) {
        if (dto.getId() == null || dto.getId() == 0) {
            throw new BusinessException("Third party sender id is required", null);
        }

        ThirdPartySenders sender = thirdPartySendersRepo.findById(dto.getId())
                .orElseThrow(() -> new BusinessException("Third party sender not found", null));

        sender.setName(dto.getName());
        sender.setAddress(dto.getAddress());
        sender.setNote(dto.getNote());
        sender.setNic(dto.getNic());
        sender.setFirst_mob(dto.getFirst_mob());
        sender.setSec_mob(dto.getSec_mob());
        sender.setWhatsapp(dto.getWhatsapp());

        ThirdPartySenders updated = thirdPartySendersRepo.save(sender);

        ThirdPartySendersDto responseDto = new ThirdPartySendersDto(
                updated.getId(),
                updated.getName(),
                updated.getAddress(),
                updated.getNote(),
                updated.getNic(),
                updated.getFirst_mob(),
                updated.getSec_mob(),
                updated.getWhatsapp(),
                updated.getCreatedAt(),
                updated.getUpdatedAt(),
                updated.getCreatedBy(),
                updated.getUpdatedBy()
        );

        return ResponseDto.<ThirdPartySendersDto>builder()
                .message("Success")
                .desc("Third party sender updated successfully")
                .object(responseDto)
                .build();
    }

    @Override
    @Transactional
    public ResponseDto<Void> deleteThirdPartySender(Integer id) {
        if (id == null || id == 0) {
            throw new BusinessException("Third party sender id is required", null);
        }

        ThirdPartySenders sender = thirdPartySendersRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Third party sender not found", null));

        try {
            thirdPartySendersRepo.delete(sender);
            thirdPartySendersRepo.flush();
        } catch (DataIntegrityViolationException e) {
            sender.setIsDeleted(true);
            thirdPartySendersRepo.save(sender);
        }

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Third party sender deleted successfully")
                .build();
    }
}
