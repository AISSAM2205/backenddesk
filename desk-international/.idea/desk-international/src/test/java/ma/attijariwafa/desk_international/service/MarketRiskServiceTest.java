package ma.attijariwafa.desk_international.service;

import ma.attijariwafa.desk_international.dto.MarketRiskDto;
import ma.attijariwafa.desk_international.entity.PnlDaily;
import ma.attijariwafa.desk_international.repository.PnlDailyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires purs du moteur de risque de marché. Les valeurs attendues
 * sont calculées À LA MAIN (pas via une ré-implémentation), ce qui prouve la
 * correction de la méthodologie (VaR paramétrique / historique, ES, vol,
 * drawdown) ET la parité avec l'ancienne référence front.
 */
class MarketRiskServiceTest {

    private PnlDailyRepository pnlRepo;
    private MarketRiskService service;

    @BeforeEach
    void setUp() {
        pnlRepo = mock(PnlDailyRepository.class);
        service = new MarketRiskService(pnlRepo);
    }

    private PnlDaily row(LocalDate d, double pnlJour, double pnlEco) {
        return PnlDaily.builder()
                .snapshotDate(d)
                .pnlJourMad(BigDecimal.valueOf(pnlJour))
                .pnlEcoMad(BigDecimal.valueOf(pnlEco))
                .build();
    }

    @Test
    @DisplayName("VaR / ES / vol / drawdown : valeurs vérifiées à la main (8 obs)")
    void computeMarketRisk_handChecked() {
        // P&L journaliers (MAD) en ordre de date croissante.
        double[] jour = { 100, -200, 300, -50, 150, -400, 250, -100 };
        // P&L éco cumulé (MAD) : pic à 1200 puis creux 800 → drawdown = 400.
        double[] eco  = { 1000, 1200, 900, 1100, 800, 1500, 1300, 1600 };

        List<PnlDaily> rows = new ArrayList<>();
        LocalDate base = LocalDate.of(2025, 1, 2);
        for (int i = 0; i < jour.length; i++) {
            rows.add(row(base.plusDays(i), jour[i], eco[i]));
        }
        when(pnlRepo.findAllByOrderBySnapshotDateAsc()).thenReturn(rows);

        MarketRiskDto r = service.computeMarketRisk(null, null);

        assertThat(r.isSufficient()).isTrue();
        assertThat(r.getNObs()).isEqualTo(8);

        // mean = 50 / 8 = 6.25
        assertThat(r.getMean()).isCloseTo(6.25, offset(1e-9));
        // std (population) = sqrt(397187.5 / 8) = sqrt(49648.4375)
        assertThat(r.getStd()).isCloseTo(222.81929, offset(1e-4));
        // annVol = std × sqrt(252)
        assertThat(r.getAnnVol()).isCloseTo(222.81929 * Math.sqrt(252), offset(1e-3));

        // VaR paramétrique = z × std
        assertThat(r.getVarParam99()).isCloseTo(2.3263 * 222.81929, offset(1e-3));
        assertThat(r.getVarParam95()).isCloseTo(1.6449 * 222.81929, offset(1e-3));

        // VaR historique (percentile empirique, interpolation linéaire) :
        // trié = [-400,-200,-100,-50,100,150,250,300]
        // p=0.01 → idx 0.07 → -400 + 200×0.07 = -386 → VaR = 386
        // p=0.05 → idx 0.35 → -400 + 200×0.35 = -330 → VaR = 330
        assertThat(r.getVarHist99()).isCloseTo(386.0, offset(1e-9));
        assertThat(r.getVarHist95()).isCloseTo(330.0, offset(1e-9));

        // ES 97,5 % : tailN = max(1, round(8×0.025)=round(0.2)=0) = 1
        // → moyenne de la pire perte = 400
        assertThat(r.getEs975()).isCloseTo(400.0, offset(1e-9));

        // Max drawdown sur l'éco cumulé = 1200 - 800 = 400
        assertThat(r.getMaxDrawdown()).isCloseTo(400.0, offset(1e-9));
    }

    @Test
    @DisplayName("Échantillon insuffisant (< 5 obs) : sufficient=false, stats nulles")
    void computeMarketRisk_insufficientSample() {
        List<PnlDaily> rows = new ArrayList<>();
        LocalDate base = LocalDate.of(2025, 1, 2);
        for (int i = 0; i < 4; i++) {
            rows.add(row(base.plusDays(i), 100, 1000));
        }
        when(pnlRepo.findAllByOrderBySnapshotDateAsc()).thenReturn(rows);

        MarketRiskDto r = service.computeMarketRisk(null, null);

        assertThat(r.isSufficient()).isFalse();
        assertThat(r.getNObs()).isEqualTo(4);
        assertThat(r.getStd()).isNull();
        assertThat(r.getVarParam99()).isNull();
        assertThat(r.getEs975()).isNull();
    }

    @Test
    @DisplayName("P&L journalier null compté comme 0 (parité front), pas écarté de nObs")
    void computeMarketRisk_nullPnlCountsAsZero() {
        List<PnlDaily> rows = new ArrayList<>();
        LocalDate base = LocalDate.of(2025, 1, 2);
        for (int i = 0; i < 5; i++) {
            PnlDaily p = PnlDaily.builder()
                    .snapshotDate(base.plusDays(i))
                    .pnlJourMad(null)          // P&L absent → 0, inclus
                    .pnlEcoMad(BigDecimal.ZERO)
                    .build();
            rows.add(p);
        }
        when(pnlRepo.findAllByOrderBySnapshotDateAsc()).thenReturn(rows);

        MarketRiskDto r = service.computeMarketRisk(null, null);

        assertThat(r.isSufficient()).isTrue();
        assertThat(r.getNObs()).isEqualTo(5);     // 5 lignes, aucune écartée
        assertThat(r.getMean()).isCloseTo(0.0, offset(1e-9));
        assertThat(r.getStd()).isCloseTo(0.0, offset(1e-9));
    }
}
