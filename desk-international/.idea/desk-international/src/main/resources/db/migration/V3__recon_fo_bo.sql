-- V3__recon_fo_bo.sql
-- Réconciliation Front Office / Back Office.
--   bo_trade           : trades vus par le Back Office (source INDÉPENDANTE du FO).
--   recon_break_status : état d'investigation des écarts, persistant entre deux runs
--                        (le rapprochement est recalculé à la volée ; seul le workflow
--                         est stocké, indexé par une clé d'écart déterministe).

CREATE TABLE IF NOT EXISTS bo_trade (
    id              BIGSERIAL PRIMARY KEY,
    isin            VARCHAR(20),
    way             VARCHAR(4)    NOT NULL,
    nominal         NUMERIC(20,2) NOT NULL,
    clean_price     NUMERIC(15,10),
    trade_date      DATE,
    value_date      DATE,
    counterparty    VARCHAR(100),
    sub_asset       VARCHAR(20),
    bo_ref          VARCHAR(60),
    upload_batch_id BIGINT,
    created_at      TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bo_trade_isin ON bo_trade (isin);

CREATE TABLE IF NOT EXISTS recon_break_status (
    id         BIGSERIAL PRIMARY KEY,
    break_key  VARCHAR(160) NOT NULL UNIQUE,
    status     VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    assignee   VARCHAR(100),
    comment    VARCHAR(500),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);
