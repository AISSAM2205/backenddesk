// service/DashboardService.java
// Ce service = le chef d'orchestre. Il appelle PnLService, PricingService
// et RiskService et assemble tout dans un DashboardDto par ISIN.
package ma.attijariwafa.desk_international.service;

import lombok.RequiredArgsConstructor;
import ma.attijariwafa.desk_international.dto.*;
import ma.attijariwafa.desk_international.entity.MarketData;
import ma.attijariwafa.desk_international.entity.VPosition;
import ma.attijariwafa.desk_international.repository.MarketDataRepository;
import ma.attijariwafa.desk_international.repository.VPositionRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final VPositionRepository posRepo;
    private final PnlService          pnlService;
    private final PricingService      pricingService;
    private final RiskService         riskService;
    private final MarketDataRepository marketDataRepo;

    /**
     * Construit le Dashboard complet pour une date.
     * Retourne 1 DashboardDto par ISIN actif (= 1 ligne du Dashboard Excel).
     *
     * Étapes :
     * 1. Récupérer toutes les positions actives (vue v_position)
     * 2. Calculer P&L pour chaque ISIN (PnLService)
     * 3. Calculer Pricing BUY/HOLD (PricingService)
     * 4. Calculer Risk DV01+Hedge (RiskService)
     * 5. Assembler en DashboardDto
     */
    public List<DashboardDto> buildDashboard(LocalDate date) {
        List<VPosition> positions = posRepo.findAllActive();

        // Calculer tout par service, indexer par ISIN pour accès rapide
        Map<String, PnLDto> pnlMap = pnlService.computeAllPnL(date).stream()
                .collect(Collectors.toMap(PnLDto::getIsin, Function.identity()));

        Map<String, PricingDto> pricingMap = pricingService.computeBuyHoldDecisions(date)
                .stream().collect(Collectors.toMap(PricingDto::getIsin, Function.identity()));

        Map<String, RiskDto> riskMap = riskService.computeAllRisks(date).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(RiskDto::getIsin, Function.identity()));

        // Market prices (pxMid, pxBid, pxAsk) — best effort for ticker display
        Map<String, MarketData> mktMap = new HashMap<>();
        for (VPosition pos : positions) {
            marketDataRepo.findByIsinAndDate(pos.getIsin(), date)
                .or(() -> marketDataRepo.findTopByInstrumentIsinOrderByDataDateDesc(pos.getIsin()))
                .ifPresent(md -> mktMap.put(pos.getIsin(), md));
        }

        return positions.stream()
                .map(pos -> assemble(pos,
                        pnlMap.get(pos.getIsin()),
                        pricingMap.get(pos.getIsin()),
                        riskMap.get(pos.getIsin()),
                        mktMap.get(pos.getIsin())))
                .sorted((a, b) -> b.getNetNominal().compareTo(a.getNetNominal()))
                .collect(Collectors.toList());
    }

    // Assemblage d'un DashboardDto depuis les 5 sources
    private DashboardDto assemble(VPosition pos, PnLDto pnl,
                                  PricingDto pricing, RiskDto risk, MarketData mkt) {
        DashboardDto.DashboardDtoBuilder b = DashboardDto.builder()
                .isin(pos.getIsin()).description(pos.getDescription())
                .currency(pos.getCurrency()).subAsset(pos.getSubAsset())
                .couponRate(pos.getCouponRate()).maturityDate(pos.getMaturityDate())
                .netNominal(pos.getNetNominal()).lastWapDirty(pos.getLastWapDirty())
                .status(pos.getStatus())
                .futuresNetPosition(pos.getFuturesNetPosition());

        if (pnl != null) {
            b.dirtyMarket(pnl.getDirtyMarket()).perfWap(pnl.getPerfWap())
                    .pnlLatentCcy(pnl.getPnlLatentCcy())
                    .pnlRealizedCcy(pnl.getPnlRealizedCcy())
                    .couponsCcy(pnl.getCouponsCcy())
                    .totalPnlCcy(pnl.getTotalPnlCcy())
                    .pnlAccountingMad(pnl.getPnlAccountingMad())
                    .fundingCostMad(pnl.getFundingCostMad())
                    .pnlEconomicMad(pnl.getPnlEconomicMad())
                    .cpnThetaMad(pnl.getCpnThetaMad())
                    .dailyFundingMad(pnl.getDailyFundingMad())
                    .netDailyMad(pnl.getNetDailyMad())
                    .netDailyAlert(pnl.isNetDailyAlert());
        }
        if (mkt != null) {
            b.pxMid(mkt.getPxMid())
             .pxBid(mkt.getPxBidAwb())
             .pxAsk(mkt.getPxAskAwb())
             .iSpreadBid(mkt.getISpreadBid());
        }
        if (pricing != null) {
            b.gSpreadBid(pricing.getGSpreadBid())
                    .gSpreadMid(pricing.getGSpreadMid())
                    .targetSpread(pricing.getTargetSpread())
                    .decision(pricing.getDecision());
        }
        if (risk != null) {
            b.modifiedDuration(risk.getModifiedDuration())
                    .dv01Bond(risk.getDv01Bond())
                    .hedgeFuture(risk.getHedgeFuture())
                    .nbContractsToHedge(risk.getNbContractsToHedge());
        }
        return b.build();
    }
}
