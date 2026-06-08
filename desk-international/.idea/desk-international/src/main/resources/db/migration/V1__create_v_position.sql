-- V1__create_v_position.sql
-- Crée la vue SQL v_position agrégeant les positions nettes depuis la table trade.
-- Hibernate (ddl-auto=update) peut avoir créé une TABLE vide v_position — on la supprime d'abord.

DROP TABLE IF EXISTS v_position CASCADE;
DROP VIEW  IF EXISTS v_position;

CREATE VIEW v_position AS
SELECT
    i.isin,
    i.description,
    i.currency,
    i.sub_asset,
    i.coupon_rate,
    i.maturity_date,

    -- Position nette : BUY positif, SELL négatif
    COALESCE(
        SUM(CASE WHEN t.way = 'BUY'  THEN  t.nominal
                 WHEN t.way = 'SELL' THEN -t.nominal
                 ELSE 0 END),
        0
    ) AS net_nominal,

    -- WAP dirty du dernier trade BUY ouvert (ordre chronologique desc)
    (
        SELECT t2.wap_dirty
        FROM   trade t2
        WHERE  t2.isin      = i.isin
          AND  t2.way       = 'BUY'
          AND  t2.is_closed = false
        ORDER  BY t2.trade_date DESC, t2.id DESC
        LIMIT  1
    ) AS wap_dirty,

    -- WAP clean du dernier trade BUY ouvert
    (
        SELECT t2.wap_clean
        FROM   trade t2
        WHERE  t2.isin      = i.isin
          AND  t2.way       = 'BUY'
          AND  t2.is_closed = false
        ORDER  BY t2.trade_date DESC, t2.id DESC
        LIMIT  1
    ) AS wap_clean,

    -- Somme des P&L réalisés (trades fermés ou legs SELL)
    COALESCE(SUM(COALESCE(t.realized_pnl, 0)), 0) AS total_realized_pnl,

    -- Nombre de trades BUY actuellement ouverts
    COUNT(CASE WHEN t.way = 'BUY' AND t.is_closed = false THEN 1 END) AS nb_open_buy_trades,

    -- Total de tous les trades sur cet ISIN
    COUNT(*) AS total_trades

FROM  instrument i
INNER JOIN trade t
       ON  t.isin      = i.isin
      AND  t.is_closed = false
WHERE i.is_active = true
GROUP BY
    i.isin, i.description, i.currency, i.sub_asset,
    i.coupon_rate, i.maturity_date
HAVING
    COALESCE(
        SUM(CASE WHEN t.way = 'BUY'  THEN  t.nominal
                 WHEN t.way = 'SELL' THEN -t.nominal
                 ELSE 0 END),
        0
    ) > 0;
