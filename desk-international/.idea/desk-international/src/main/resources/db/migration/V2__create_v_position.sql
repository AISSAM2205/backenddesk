-- V2__create_v_position.sql
-- Crée la VUE SQL v_position agrégeant les positions nettes depuis la table trade.
--
-- Robuste quel que soit l'état préalable de l'objet « v_position » :
--   - TABLE vide créée par Hibernate (ddl-auto=update sur l'entité VPosition), ou
--   - VUE déjà présente.
-- On supprime selon le TYPE RÉEL avant de recréer : un simple « DROP TABLE IF EXISTS »
-- échoue sous PostgreSQL si l'objet existe mais n'est pas du type attendu (et IF EXISTS
-- ne masque pas l'erreur de type).

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views
               WHERE table_schema = 'public' AND table_name = 'v_position') THEN
        EXECUTE 'DROP VIEW v_position';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'v_position') THEN
        EXECUTE 'DROP TABLE v_position CASCADE';
    END IF;
END $$;

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
