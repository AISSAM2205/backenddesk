// service/TradeService.java
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.attijariwafa.desk_international.dto.TradeCreateDto;
import ma.attijariwafa.desk_international.entity.Trade;
import ma.attijariwafa.desk_international.repository.InstrumentRepository;
import ma.attijariwafa.desk_international.repository.TradeRepository;
import ma.attijariwafa.desk_international.service.WapCalculatorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import static java.math.BigDecimal.ZERO;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeService {

    private final TradeRepository      tradeRepo;
    private final InstrumentRepository instrRepo;
    private final WapCalculatorService wapService;

    /**
     * Créer un trade bond (BUY ou SELL) via l'API.
     * Le trader saisit le minimum : isin, nominal, cleanPrice, accrued, way.
     * Le WAP et le P&L réalisé sont calculés automatiquement.
     */
    @Transactional
    public Trade createBondTrade(TradeCreateDto dto) {

        // Vérifier que l'ISIN existe
        var instr = instrRepo.findById(dto.getIsin())
                .orElseThrow(() -> new IllegalArgumentException(
                        "ISIN inconnu : " + dto.getIsin()));

        // Calculer dirty price si absent
        BigDecimal acc   = dto.getAccrued() != null ? dto.getAccrued() : ZERO;
        BigDecimal dirty = dto.getDirtyPrice() != null
                ? dto.getDirtyPrice()
                : dto.getCleanPrice().add(acc);

        // Construire le trade
        Trade trade = Trade.builder()
                .assetIdentifier(dto.getIsin())
                .bondInstrument(instr)
                .subAsset(instr.getSubAsset())
                .tradeDate(dto.getTradeDate())
                .valueDate(dto.getValueDate())
                .way(dto.getWay().toUpperCase())
                .nominal(dto.getNominal().abs())
                .cleanPrice(dto.getCleanPrice())
                .accrued(acc).dirtyPrice(dirty)
                .gSpread(dto.getGSpread())
                .counterparty(dto.getCounterparty())
                .commissionType(dto.getCommissionType())
                .isClosed(false).realizedPnl(ZERO)
                .build();

        if ("BUY".equals(trade.getWay())) {
            tradeRepo.save(trade);
            BigDecimal wapD = wapService.calculateWapDirty(dto.getIsin());
            trade.setWapDirty(wapD);
            trade.setWapClean(wapD.subtract(acc));

        } else if ("SELL".equals(trade.getWay())) {
            BigDecimal wap = wapService.calculateWapDirty(dto.getIsin());
            BigDecimal pnl = wapService.calcRealizedPnl(dirty, wap, trade.getNominal());
            trade.setWapDirty(wap);
            trade.setRealizedPnl(pnl);
        }
        return tradeRepo.save(trade);
    }

    /**
     * Créer un trade future (hedge) via l'API.
     */
    @Transactional
    public Trade createFutureTrade(TradeCreateDto dto) {
        Trade trade = Trade.builder()
                .assetIdentifier(dto.getTicker())
                .subAsset("Future")
                .tradeDate(dto.getTradeDate())
                .way(dto.getWay().toUpperCase())
                .nominal(BigDecimal.valueOf(dto.getNbContracts()))
                .nbContracts(dto.getNbContracts())
                .contractSize(new BigDecimal("100000"))
                .cleanPrice(dto.getEntryPrice())
                .hedBondIsin(dto.getHedBondIsin())
                .isClosed(false).mtmPnl(ZERO)
                .build();

        if (dto.getLastPrice() != null) {
            BigDecimal mtm = wapService.calcFutureMtm(
                    trade.getWay(), dto.getLastPrice(), dto.getEntryPrice(),
                    dto.getNbContracts(), new BigDecimal("100000"));
            trade.setMtmPnl(mtm);
            trade.setLastPrice(dto.getLastPrice());
        }
        return tradeRepo.save(trade);
    }

    // Récupérer les trades avec filtres optionnels
    public List<Trade> getTrades(String isin, String way, String subAsset) {
        return tradeRepo.findWithFilters(isin, way, subAsset);
    }

    public Trade getById(Long id) {
        return tradeRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Trade non trouvé : " + id));
    }

    // Annuler un trade (is_closed = true)
    @Transactional
    public Trade cancelTrade(Long id) {
        Trade t = getById(id);
        t.setIsClosed(true);
        return tradeRepo.save(t);
    }
}
