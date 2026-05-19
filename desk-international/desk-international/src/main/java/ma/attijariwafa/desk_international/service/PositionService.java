// service/PositionService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.PositionDto;
import ma.attijariwafa.desk_international.entity.VPosition;
import ma.attijariwafa.desk_international.repository.VPositionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PositionService {

    private final VPositionRepository posRepo;

    // Toutes les positions (y compris celles avec netNominal = 0)
    public List<PositionDto> getAllPositions() {
        return posRepo.findAll().stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    // Uniquement les positions actives (netNominal > 0), triées par taille
    public List<PositionDto> getAllActivePositions() {
        return posRepo.findAllActive().stream()
                .map(this::toDto)
                .sorted((a, b) -> b.getNetNominal().compareTo(a.getNetNominal()))
                .collect(Collectors.toList());
    }

    // Position d'un ISIN précis
    public Optional<PositionDto> getPositionByIsin(String isin) {
        return posRepo.findByIsin(isin).map(this::toDto);
    }

    // Convertir VPosition (entité vue SQL) → PositionDto
    private PositionDto toDto(VPosition p) {
        return PositionDto.builder()
                .isin(p.getIsin()).description(p.getDescription())
                .currency(p.getCurrency()).subAsset(p.getSubAsset())
                .couponRate(p.getCouponRate()).maturityDate(p.getMaturityDate())
                .netNominal(p.getNetNominal())
                .lastWapDirty(p.getLastWapDirty())
                .lastWapClean(p.getLastWapClean())
                .status(p.getStatus())
                .totalRealizedPnl(p.getTotalRealizedPnl())
                .futuresNetPosition(p.getFuturesNetPosition())
                .build();
    }
}
