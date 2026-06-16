BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

TRUNCATE audit_log, external_pnl_snapshot, pnl_daily, tbill_position,
         coupon_received, trader_limit, portfolio_limit, pricing_config,
         risk_metrics, market_data, market_rates, trade, app_user, instrument
         RESTART IDENTITY CASCADE;

INSERT INTO instrument (isin, description, issuer, currency, sub_asset,
  coupon_rate, coupon_frequency, maturity_date, issue_date, nominal_outstanding, is_active)
VALUES
('XS2239830222','MOROC 1 3/8 03/30/26',   'MOROCCO','EUR','Mor Bond',1.3750,2,'2026-03-30','2021-03-23',1000000000,true),
('XS2270576619','MOROC 2 3/8 12/15/27',   'MOROCCO','USD','Mor Bond',2.3750,2,'2027-12-15','2020-11-24',1250000000,true),
('XS2595028452','MOROC 5.95 03/08/28',    'MOROCCO','USD','Mor Bond',5.9500,2,'2028-03-08','2023-03-08',1000000000,true),
('XS3041270664','MOROC 3 7/8 04/02/29',   'MOROCCO','EUR','Mor Bond',3.8750,1,'2029-04-02','2024-04-02',1500000000,true),
('XS2239829216','MOROC 2 09/30/30',       'MOROCCO','EUR','Mor Bond',2.0000,1,'2030-09-30','2020-09-23',1000000000,true),
('XS2080771806','MOROC 1 1/2 11/27/31',   'MOROCCO','EUR','Mor Bond',1.5000,1,'2031-11-27','2021-11-24',1000000000,true),
('XS2270576965','MOROC 3 12/15/32',       'MOROCCO','USD','Mor Bond',3.0000,2,'2032-12-15','2020-11-24', 750000000,true),
('XS2595028700','MOROC 6 1/2 09/08/33',   'MOROCCO','USD','Mor Bond',6.5000,2,'2033-09-08','2023-09-08',1500000000,true),
('XS3041322051','MOROC 4 3/4 04/02/35',   'MOROCCO','EUR','Mor Bond',4.7500,1,'2035-04-02','2024-04-02',1500000000,true),
('XS2270577344','MOROC 4 12/15/50',       'MOROCCO','USD','Mor Bond',4.0000,2,'2050-12-15','2020-11-24', 500000000,true),
('XS1221677120','OCPMR 4 1/2 10/22/25',   'OCP SA', 'USD','OCP Bond',4.5000,2,'2025-10-22','2015-10-22', 750000000,true),
('XS3040572979','OCPMR 6.1 04/30/30',     'OCP SA', 'USD','OCP Bond',6.1000,2,'2030-04-30','2025-04-30',1000000000,true),
('XS2355149316','OCPMR 3 3/4 06/23/31',   'OCP SA', 'USD','OCP Bond',3.7500,2,'2031-06-23','2021-06-09', 700000000,true),
('XS2810168737','OCPMR 6 3/4 05/02/34',   'OCP SA', 'USD','OCP Bond',6.7500,2,'2034-05-02','2024-05-02',1000000000,true),
('XS3040573191','OCPMR 6.7 03/01/36',     'OCP SA', 'USD','OCP Bond',6.7000,2,'2036-03-01','2025-03-01',1000000000,true),
('XS2400000001','CLN MOROC 5.00 05/15/27','AWB DESK','USD','CLN MOROC',5.0000,2,'2027-05-15','2024-05-15',100000000,true),
('EG0000123456','EGP T-Bill 91J', 'EGYPT','EGP','EGP Bill',0.0000,4,CURRENT_DATE+61, CURRENT_DATE-30,500000000,true),
('EG0000654321','EGP T-Bill 182J','EGYPT','EGP','EGP Bill',0.0000,2,CURRENT_DATE+152,CURRENT_DATE-30,300000000,true);

INSERT INTO app_user (username, email, password_hash, role, full_name, is_active)
VALUES
('trader',   'trader@attijariwafa.ma',    crypt('AWB2025!',  gen_salt('bf')),'TRADER',  'Desk Trader International',true),
('admin',    'admin@attijariwafa.ma',     crypt('Admin2025!',gen_salt('bf')),'ADMIN',   'Administrateur Systeme',   true),
('direction','direction@attijariwafa.ma', crypt('AWB2025!',  gen_salt('bf')),'READONLY','Direction Financiere',     true),
('maitif',   'm.aitif@attijariwafa.ma',   crypt('AWB2025!',  gen_salt('bf')),'TRADER',  'Mohamed Aitif',            true),
('hbenali',  'h.benali@attijariwafa.ma',  crypt('AWB2025!',  gen_salt('bf')),'TRADER',  'Hassan Benali',            true);

INSERT INTO portfolio_limit (portfolio_name, limit_type, currency, category, color_token, limit_meur, max_duration_years, effective_date, is_active)
VALUES
('Eurobonds (EUR)','EXPOSURE','EUR','EUROBONDS','var(--eb)', 280.00,7.00,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('CLN Maroc (USD)','EXPOSURE','USD','CLN_MOROC','var(--cln)',135.00,5.00,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('CLN GCC (USD)',  'EXPOSURE','USD','CLN_GCC',  '#7C3AED',   30.00,5.00,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('EGP Bills (USD)','EXPOSURE','USD','EGP_BILLS','var(--egp)', 20.00,1.00,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('Eurobond Maroc', 'TARGET',  'USD','MOROC',    'var(--eb)',  50.00,NULL,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('Eurobond OCP',   'TARGET',  'USD','OCP',      '#9B3EEF',    15.00,NULL,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('CLN',            'TARGET',  'USD','CLN',      'var(--cln)', 24.00,NULL,DATE_TRUNC('year',CURRENT_DATE)::date,true),
('EGP Bills',      'TARGET',  'USD','EGP',      'var(--egp)', 60.00,NULL,DATE_TRUNC('year',CURRENT_DATE)::date,true);

INSERT INTO trader_limit (user_id, instrument_type, limit_amount, currency, used_amount)
SELECT u.id, v.instrument_type, v.limit_amount::numeric, v.currency, v.used_amount::numeric
FROM app_user u
JOIN (VALUES
  ('trader', 'EUROBONDS',  50000000,'EUR', 18000000),
  ('trader', 'CLN_MOROC',  20000000,'USD',  3000000),
  ('trader', 'CLN_GCC',    15000000,'USD',        0),
  ('trader', 'EGP',        10000000,'USD',  1023541),
  ('maitif', 'EUROBONDS',  80000000,'EUR', 43460000),
  ('maitif', 'CLN_MOROC',  25000000,'USD',  3000000),
  ('maitif', 'CLN_GCC',    20000000,'USD',        0),
  ('maitif', 'EGP',        10000000,'USD',        0),
  ('hbenali','EUROBONDS',  30000000,'EUR',  8000000),
  ('hbenali','CLN_MOROC',  10000000,'USD',        0),
  ('hbenali','CLN_GCC',    10000000,'USD',        0),
  ('hbenali','EGP',         5000000,'USD',  1023541),
  ('admin',  'EUROBONDS', 280000000,'EUR',215000000),
  ('admin',  'CLN_MOROC',  50000000,'USD',  3000000),
  ('admin',  'CLN_GCC',    30000000,'USD',        0),
  ('admin',  'EGP',        20000000,'USD',  2047082)
) AS v(username,instrument_type,limit_amount,currency,used_amount)
ON u.username = v.username;

INSERT INTO market_rates (rate_date,eur_mad,usd_mad,eur_usd,estr_rate,sofr_rate,usd_egp,cbe_rate,shock_bps)
SELECT d::date,10.4181,9.2513,1.1261,2.1710,4.3000,49.9306,27.2500,10
FROM (
  SELECT d FROM generate_series(CURRENT_DATE-90,CURRENT_DATE,INTERVAL '1 day') t(d)
  WHERE EXTRACT(DOW FROM d) NOT IN (0,6)
  ORDER BY d DESC LIMIT 45
) x;

INSERT INTO market_data (isin,data_date,px_last,px_mid,accrued_bloomberg,px_bid_awb,px_ask_awb,g_spread_bid,g_spread_ask,i_spread_bid,i_spread_ask)
VALUES
('XS2239830222',CURRENT_DATE,0.98393,0.98351,0.001997,0.97870,0.97380,134.31,121.16, 92.80, 80.20),
('XS2270576619',CURRENT_DATE,0.93076,0.93094,0.010358,0.92560,0.91950,147.46,121.16,162.34,144.56),
('XS2595028452',CURRENT_DATE,1.01865,1.01920,0.012231,1.01400,1.00900,136.00,126.00,125.00,115.00),
('XS3041270664',CURRENT_DATE,1.00268,1.00267,0.005308,0.99760,0.99260,110.00,100.00, 95.00, 87.00),
('XS2239829216',CURRENT_DATE,0.90558,0.90567,0.002904,0.90050,0.89530,155.00,145.00,140.00,130.00),
('XS2080771806',CURRENT_DATE,0.84864,0.84884,0.007233,0.84350,0.83850,175.00,165.00,158.00,148.00),
('XS2270576965',CURRENT_DATE,0.83120,0.83157,0.013083,0.82640,0.82130,195.00,185.00,178.00,168.00),
('XS2595028700',CURRENT_DATE,1.03927,1.04052,0.013361,1.03420,1.02900,155.00,145.00,138.00,128.00),
('XS3041322051',CURRENT_DATE,0.99257,0.99323,0.006507,0.98760,0.98240,115.00,105.00,100.00, 92.00),
('XS2270577344',CURRENT_DATE,0.66235,0.66356,0.017444,0.65730,0.65120,290.00,280.00,265.00,255.00),
('XS1221677120',CURRENT_DATE,1.00000,1.00000,0.003750,0.99500,0.99000, 80.00, 70.00, 70.00, 60.00),
('XS3040572979',CURRENT_DATE,1.00473,1.00359,0.003728,0.99860,0.99360,155.00,145.00,138.00,128.00),
('XS2355149316',CURRENT_DATE,0.88699,0.88605,0.015521,0.88180,0.87670,195.00,185.00,178.00,168.00),
('XS2810168737',CURRENT_DATE,1.01265,1.01184,0.003750,1.00760,1.00240,175.00,165.00,158.00,148.00),
('XS3040573191',CURRENT_DATE,0.98896,0.98852,0.004094,0.98380,0.97870,170.00,160.00,153.00,143.00),
('XS2400000001',CURRENT_DATE,1.01250,1.01250,0.012500,1.00750,1.00200,155.00,145.00,138.00,128.00),
('EG0000123456',CURRENT_DATE,0.98590,0.98590,0.000000,0.98490,0.98390,  0.00,  0.00,  0.00,  0.00),
('EG0000654321',CURRENT_DATE,0.97200,0.97200,0.000000,0.97100,0.97000,  0.00,  0.00,  0.00,  0.00);

INSERT INTO risk_metrics (isin,metrics_date,modified_duration,dv01_per_million,ytm_mid,hedge_future,ctd_isin,duration_ctd,conv_factor,contract_size,convexity)
VALUES
('XS2239830222',CURRENT_DATE, 0.770,  77.00,3.0000,'RXM5','DE000BU22064',1.270338,0.945793,100000,  0.80),
('XS2270576619',CURRENT_DATE, 2.409, 226.76,5.2900,'FVM5','US91282CKD29',3.430782,0.936300,100000,  7.00),
('XS2595028452',CURRENT_DATE, 2.523, 260.21,5.1993,'FVM5','US91282CKD29',3.430782,0.936300,100000,  8.10),
('XS3041270664',CURRENT_DATE, 3.512, 353.97,3.7971,'FVM5','US91282CKD29',3.430782,0.936300,100000, 15.50),
('XS2239829216',CURRENT_DATE, 4.908, 445.97,3.9906,'RXM5','DE000BU2Z015',7.203520,0.774902,100000, 29.50),
('XS2080771806',CURRENT_DATE, 5.932, 507.81,4.1976,'RXM5','DE000BU2Z015',7.203520,0.774902,100000, 43.50),
('XS2270576965',CURRENT_DATE, 6.443, 544.24,5.7800,'TYM5','US91282CLJ89',5.480433,0.880400,100000, 55.00),
('XS2595028700',CURRENT_DATE, 6.314, 665.44,5.8741,'TYM5','US91282CLJ89',5.480433,0.880400,100000, 50.00),
('XS3041322051',CURRENT_DATE, 7.673, 767.05,4.8362,'TYM5','US91282CLJ89',5.480433,0.880400,100000, 73.00),
('XS2270577344',CURRENT_DATE,13.135, 894.47,6.7905,'TYM5','US91282CLJ89',5.480433,0.880400,100000,250.00),
('XS1221677120',CURRENT_DATE, 0.400,  40.00,4.5000,NULL,NULL,NULL,NULL,100000,0.20),
('XS3040572979',CURRENT_DATE, 4.136, 422.87,6.0138,'FVM5','US91282CKD29',3.430782,0.936300,100000, 21.00),
('XS2355149316',CURRENT_DATE, 5.203, 469.09,6.0127,'FVM5','US91282CKD29',3.430782,0.936300,100000, 34.00),
('XS2810168737',CURRENT_DATE, 6.491, 673.30,6.5720,'TYM5','US91282CLJ89',5.480433,0.880400,100000, 52.00),
('XS3040573191',CURRENT_DATE, 7.100, 710.00,6.5500,'TYM5','US91282CLJ89',5.480433,0.880400,100000, 63.00),
('XS2400000001',CURRENT_DATE, 1.250,   3.75,4.6500,NULL,NULL,NULL,NULL,100000,1.80),
('EG0000123456',CURRENT_DATE, 0.240,   0.012,24.5000,NULL,NULL,NULL,NULL,100000,0.07),
('EG0000654321',CURRENT_DATE, 0.470,   0.014,25.0000,NULL,NULL,NULL,NULL,100000,0.25);

INSERT INTO pricing_config (isin,config_date,g_spread_bid,g_spread_ask,historical_avg_spread,target_spread,decision,shock_bps)
VALUES
('XS2239830222',CURRENT_DATE,134.31,121.16,127.74,120.00,'HOLD',10),
('XS2270576619',CURRENT_DATE,147.46,121.16,134.31,128.00,'BUY', 10),
('XS2595028452',CURRENT_DATE,136.00,126.00,131.00,125.00,'BUY', 10),
('XS3041270664',CURRENT_DATE,110.00,100.00,105.00,100.00,'BUY', 10),
('XS2239829216',CURRENT_DATE,155.00,145.00,150.00,148.00,'HOLD',10),
('XS2080771806',CURRENT_DATE,175.00,165.00,170.00,168.00,'BUY', 10),
('XS2270576965',CURRENT_DATE,195.00,185.00,190.00,188.00,'HOLD',10),
('XS2595028700',CURRENT_DATE,155.00,145.00,150.00,148.00,'BUY', 10),
('XS3041322051',CURRENT_DATE,115.00,105.00,110.00,108.00,'BUY', 10),
('XS2270577344',CURRENT_DATE,290.00,280.00,285.00,275.00,'HOLD',10),
('XS1221677120',CURRENT_DATE, 80.00, 70.00, 75.00, 72.00,'HOLD',10),
('XS3040572979',CURRENT_DATE,155.00,145.00,150.00,148.00,'BUY', 10),
('XS2355149316',CURRENT_DATE,195.00,185.00,190.00,185.00,'BUY', 10),
('XS2810168737',CURRENT_DATE,175.00,165.00,170.00,168.00,'BUY', 10),
('XS3040573191',CURRENT_DATE,170.00,160.00,165.00,163.00,'HOLD',10),
('XS2400000001',CURRENT_DATE,155.00,145.00,150.00,148.00,'BUY', 10),
('EG0000123456',CURRENT_DATE,  0.00,  0.00,  0.00,  0.00,'HOLD',10),
('EG0000654321',CURRENT_DATE,  0.00,  0.00,  0.00,  0.00,'HOLD',10);

INSERT INTO trade (isin,sub_asset,trade_date,value_date,way,nominal,
  clean_price,accrued,dirty_price,wap_dirty,wap_clean,g_spread,
  trade_category,counterparty,realized_pnl,mtm_pnl,is_closed)
VALUES
('XS2239830222','Mor Bond','2024-12-29','2025-01-02','BUY',18677000,
  0.970820,0.010510,0.981330,0.985942,0.970820,157.60,
  'TRADING','Stock 29 12 2024',0,ROUND((0.983510-0.985942)*18677000,2),false),
('XS2595028452','Mor Bond','2024-12-29','2025-01-02','BUY',65610000,
  1.006680,0.019010,1.025690,1.025690,1.006680,142.77,
  'TRADING','Stock 29 12 2024',0,ROUND((1.019200-1.025690)*65610000,2),false),
('XS2595028452','Mor Bond','2025-01-21','2025-01-23','BUY',7850000,
  1.010000,0.022100,1.032100,1.030299,1.010000,139.50,
  'TRADING','Citi Group',0,ROUND((1.019200-1.030299)*7850000,2),false),
('XS2080771806','Mor Bond','2024-12-29','2025-01-02','BUY',8826000,
  0.845320,0.001520,0.846840,0.846840,0.845320,195.63,
  'TRADING','Stock 29 12 2024',0,ROUND((0.848840-0.846840)*8826000,2),false),
('XS2080771806','Mor Bond','2025-01-29','2025-01-31','BUY',5000000,
  0.853950,0.002671,0.856621,0.848824,0.853950,165.00,
  'TRADING','Tradition Dubai',0,ROUND((0.848840-0.848824)*5000000,2),false),
('XS2595028700','Mor Bond','2024-12-29','2025-01-02','BUY',10985000,
  1.031300,0.020760,1.052060,1.052060,1.031300,149.52,
  'TRADING','Stock 29 12 2024',0,ROUND((1.040520-1.049620)*10985000,2),false),
('XS2595028700','Mor Bond','2025-03-03','2025-03-06','SELL',4015000,
  1.036200,0.029419,1.065619,1.049620,1.036200,63.00,
  'Market Making','CAP MONETAIRE PREMIER',82452,0,true),
('XS1221677120','OCP Bond','2024-12-29','2025-01-02','BUY',16594000,
  0.993180,0.008880,1.002060,1.002060,0.993180,117.38,
  'TRADING','Stock 29 12 2024',0,ROUND((1.000000-1.002060)*16594000,2),false),
('XS1221677120','OCP Bond','2025-02-01','2025-02-03','SELL',20000000,
  0.998000,0.005000,1.003000,1.002060,0.998000,85.00,
  'TRADING','JPMorgan',19688,0,true),
('XS2355149316','OCP Bond','2024-12-29','2025-01-02','BUY',11759000,
  0.865560,0.001040,0.866600,0.866600,0.865560,185.65,
  'TRADING','Stock 29 12 2024',0,ROUND((0.886045-0.866600)*11759000,2),false),
('XS2810168737','OCP Bond','2024-12-29','2025-01-02','BUY',6000000,
  1.021230,0.011440,1.032670,1.032670,1.021230,188.96,
  'TRADING','Stock 29 12 2024',0,ROUND((1.011840-1.032670)*6000000,2),false),
('XS3041270664','Mor Bond','2025-01-07','2025-01-09','BUY',1800000,
  0.998100,0.005300,1.003400,0.998106,0.998100,110.00,
  'TRADING','Citi Group',0,ROUND((1.002670-0.998106)*1800000,2),false),
('XS3041322051','Mor Bond','2024-12-29','2025-01-02','BUY',40566000,
  0.992386,0.006507,0.998893,0.994983,0.992386,120.00,
  'TRADING','Stock 29 12 2024',0,ROUND((0.993230-0.994983)*40566000,2),false),
('XS3040572979','OCP Bond','2025-04-30','2025-05-02','BUY',8000000,
  0.990060,0.003728,0.993788,0.990060,0.990060,150.00,
  'TRADING','Goldman Sachs',0,ROUND((1.003590-0.990060)*8000000,2),false),
('EG0000123456','EGP Bill',CURRENT_DATE-30,CURRENT_DATE-28,'BUY',50000000,
  0.939000,0.000000,0.939000,0.939000,0.939000,0.00,
  'TRADING','Banque Misr',0,ROUND((0.985900-0.939000)*50000000,2),false),
('EG0000654321','EGP Bill',CURRENT_DATE-30,CURRENT_DATE-28,'BUY',30000000,
  0.960000,0.000000,0.960000,0.960000,0.960000,0.00,
  'TRADING','CIB Egypt',0,ROUND((0.972000-0.960000)*30000000,2),false),
('XS2400000001','CLN MOROC','2025-01-10','2025-01-14','BUY',3000000,
  1.007500,0.012500,1.020000,1.020000,1.007500,152.00,
  'MONTAGE','AWB Internal',0,ROUND((1.025000-1.020000)*3000000,2),false);

INSERT INTO trade (asset_identifier,sub_asset,trade_date,value_date,way,nominal,
  nb_contracts,contract_size,clean_price,dirty_price,last_price,mtm_pnl,hed_bond_isin,is_closed)
VALUES
('FVM5','Future','2025-02-24','2025-02-24','SELL',110400000,1104,100000,
  1.067969,1.067969,1.067750,ROUND((1.067969-1.067750)*1104*100000,2),'XS2595028452',false),
('TYM5','Future','2025-02-24','2025-02-24','SELL',55500000,555,100000,
  1.096875,1.096875,1.096250,ROUND((1.096875-1.096250)*555*100000,2),'XS2595028700',false),
('RXM5','Future','2025-03-03','2025-03-03','SELL',156700000,1567,100000,
  1.319200,1.319200,1.318500,ROUND((1.319200-1.318500)*1567*100000,2),'XS2080771806',false);

INSERT INTO coupon_received (isin,payment_date,amount,currency)
VALUES
('XS2595028452','2024-09-08',2185435.00,'USD'),
('XS2595028452','2025-03-08',2185435.00,'USD'),
('XS2595028452','2025-09-08',2185435.00,'USD'),
('XS2595028700','2024-09-08', 356912.50,'USD'),
('XS2595028700','2025-03-08', 356912.50,'USD'),
('XS2239830222','2024-09-30', 128405.63,'EUR'),
('XS2239830222','2025-03-30', 128405.63,'EUR'),
('XS2080771806','2024-11-27', 207390.00,'EUR'),
('XS2080771806','2025-11-27', 207390.00,'EUR'),
('XS3041270664','2025-04-02',  69750.00,'EUR'),
('XS3041322051','2025-04-02',1926885.00,'EUR'),
('XS1221677120','2024-10-22', 373365.00,'USD'),
('XS1221677120','2025-04-22', 373365.00,'USD'),
('XS2355149316','2024-12-23', 220481.25,'USD'),
('XS2355149316','2025-06-23', 220481.25,'USD'),
('XS2810168737','2024-11-02', 202500.00,'USD'),
('XS2810168737','2025-05-02', 202500.00,'USD'),
('XS3040572979','2025-04-30', 244000.00,'USD'),
('XS2400000001','2024-11-15',  75000.00,'USD'),
('XS2400000001','2025-05-15',  75000.00,'USD');

WITH raw AS (
  SELECT d::date AS snapshot_date,
         ROW_NUMBER() OVER (ORDER BY d DESC) AS rn_desc
  FROM generate_series(CURRENT_DATE-120,CURRENT_DATE-1,INTERVAL '1 day') t(d)
  WHERE EXTRACT(DOW FROM d) NOT IN (0,6)
),
bdays AS (
  SELECT snapshot_date, ROW_NUMBER() OVER (ORDER BY snapshot_date) AS rn
  FROM raw WHERE rn_desc <= 60
),
curve AS (
  SELECT snapshot_date, rn,
    ROUND((35000000+rn*585000+2500000*SIN(rn*0.38)+1800000*COS(rn*0.12)+900000*SIN(rn*0.71))::numeric,0) AS pnl_eco_mad,
    ROUND((585000+950000*SIN(rn*0.38)+380000*COS(rn*0.22))::numeric,0) AS pnl_jour_mad,
    ROUND((46000*rn)::numeric,0) AS fin_eur_mad,
    ROUND((140000*rn)::numeric,0) AS fin_usd_mad,
    ROUND((186000*rn)::numeric,0) AS fin_total_mad
  FROM bdays
)
INSERT INTO pnl_daily (snapshot_date,pnl_eco_mad,pnl_jour_mad,pnl_total_gestion_mad,
  position_eur_usd,position_usd,taux_eur,taux_usd,
  fin_eur_mad,fin_usd_mad,fin_total_mad,fin_cumul_mad,
  pl_bond_eur,pl_bond_usd,pl_fut_eur,pl_fut_usd)
SELECT snapshot_date,pnl_eco_mad,pnl_jour_mad,pnl_eco_mad+fin_total_mad,
  16590000,127000000,0.021710,0.043000,
  fin_eur_mad,fin_usd_mad,fin_total_mad,fin_total_mad,
  ROUND(pnl_eco_mad*0.12,0),ROUND(pnl_eco_mad*0.72,0),
  ROUND(pnl_eco_mad*0.06,0),ROUND(pnl_eco_mad*0.10,0)
FROM curve;

INSERT INTO tbill_position (isin,emetteur,devise,snapshot_date,nominal,yield_net,yield_brut,duration,
  pl_yield_usd,pl_fx_usd,pl_eco_usd,funding_usd,fx_moyen,fx_current,
  fx_breakeven_avec,fx_breakeven_sans,fx_stop_loss,maturity_date,date_initiation,limit_nominal)
VALUES
('US912796ZT70','US Treasury',          'USD',CURRENT_DATE,50000000,5.42,5.85,0.25,
   680000,-45000,635000,-210000,9.9200,9.2513,9.7850,9.8300,9.5000,
  CURRENT_DATE+92,CURRENT_DATE-92,100000000),
('US912796YH08','US Treasury',          'USD',CURRENT_DATE,30000000,5.28,5.70,0.50,
   396000,-28000,368000,-126000,9.8750,9.2513,9.7350,9.7900,9.5000,
  CURRENT_DATE+183,CURRENT_DATE-183,100000000),
('FR0013519668','Tresor Francais (BTF)','EUR',CURRENT_DATE,20000000,3.15,3.80,0.25,
   157500,12000,169500,-63000,10.6500,10.4181,10.5200,10.5700,10.2000,
  CURRENT_DATE+92,CURRENT_DATE-92,50000000);

INSERT INTO external_pnl_snapshot (isin,description,asset_category,snapshot_date,nominal_usd,coupon_rate,
  counterparty,maturity_date,pl_realized_usd,pl_latent_usd,pl_eco_usd,pl_eco_mad,funding_usd,duration,wap_fx_entry,source)
VALUES
('XS2400000001','CLN MOROC 5.00 05/15/2027','CLN',CURRENT_DATE,
  3000000.00,0.050000,'AWB Internal','2027-05-15',0,15000.00,2292797.00,21211012.00,-67600.00,1.2500,NULL,'MOCK_BLOOMBERG'),
('EG0000123456','EGP T-Bill 91J','EGP_BILL',CURRENT_DATE,
  1023541.00,0.245000,'Banque Misr',CURRENT_DATE+61,0,48056.00,481615.00,4453569.00,0.00,0.2500,49.9306,'MOCK_BLOOMBERG'),
('EG0000654321','EGP T-Bill 182J','EGP_BILL',CURRENT_DATE,
  614125.00,0.250000,'CIB Egypt',CURRENT_DATE+152,0,7390.00,73937.00,683400.00,0.00,0.4700,49.9306,'MOCK_BLOOMBERG');

INSERT INTO audit_log (username,table_name,action,record_id,details,ip_address,created_at)
VALUES
('admin','instrument','INSERT',NULL,'{"isin":"XS2595028452","desc":"MOROC 5.95 03/08/28"}'::jsonb,NULL,(CURRENT_DATE-30)::timestamp+INTERVAL '9 hours'),
('admin','instrument','INSERT',NULL,'{"isin":"XS3041322051","desc":"MOROC 4 3/4 04/02/35"}'::jsonb,NULL,(CURRENT_DATE-28)::timestamp+INTERVAL '10 hours'),
('admin','instrument','INSERT',NULL,'{"isin":"XS3040572979","desc":"OCPMR 6.1 04/30/30"}'::jsonb,NULL,(CURRENT_DATE-22)::timestamp+INTERVAL '11 hours'),
('admin','app_user','INSERT',NULL,'{"username":"maitif","role":"TRADER"}'::jsonb,NULL,(CURRENT_DATE-25)::timestamp+INTERVAL '9 hours'),
('admin','app_user','INSERT',NULL,'{"username":"hbenali","role":"TRADER"}'::jsonb,NULL,(CURRENT_DATE-25)::timestamp+INTERVAL '9 hours 30 minutes'),
('maitif','trade','INSERT',1,'{"isin":"XS2595028452","nominal":"65610000","way":"BUY"}'::jsonb,'10.0.2.45',(CURRENT_DATE-20)::timestamp+INTERVAL '8 hours 45 minutes'),
('maitif','trade','INSERT',NULL,'{"isin":"XS2595028452","nominal":"7850000","way":"BUY"}'::jsonb,'10.0.2.45',(CURRENT_DATE-15)::timestamp+INTERVAL '9 hours 10 minutes'),
('hbenali','trade','INSERT',NULL,'{"isin":"XS3040572979","nominal":"8000000","way":"BUY"}'::jsonb,'10.0.2.46',(CURRENT_DATE-18)::timestamp+INTERVAL '8 hours 50 minutes'),
('admin','trader_limit','UPDATE',NULL,'{"user":"maitif","type":"EUROBONDS","from":"40000000","to":"80000000"}'::jsonb,NULL,(CURRENT_DATE-15)::timestamp+INTERVAL '14 hours'),
('admin','portfolio_limit','UPDATE',NULL,'{"name":"Eurobonds EUR","from":"250.00","to":"280.00"}'::jsonb,NULL,(CURRENT_DATE-10)::timestamp+INTERVAL '16 hours'),
('trader','csv_upload','IMPORT',NULL,'{"file":"blotter_20250520.csv","imported":"85","errors":"0"}'::jsonb,'10.0.2.43',(CURRENT_DATE-5)::timestamp+INTERVAL '9 hours'),
('admin','app_user','UPDATE',NULL,'{"username":"direction","isActive":"true"}'::jsonb,NULL,(CURRENT_DATE-1)::timestamp+INTERVAL '11 hours');

SELECT 'instrument'    AS tbl,COUNT(*) FROM instrument
UNION ALL SELECT 'app_user',       COUNT(*) FROM app_user
UNION ALL SELECT 'portfolio_limit',COUNT(*) FROM portfolio_limit
UNION ALL SELECT 'trader_limit',   COUNT(*) FROM trader_limit
UNION ALL SELECT 'market_rates',   COUNT(*) FROM market_rates
UNION ALL SELECT 'market_data',    COUNT(*) FROM market_data
UNION ALL SELECT 'risk_metrics',   COUNT(*) FROM risk_metrics
UNION ALL SELECT 'pricing_config', COUNT(*) FROM pricing_config
UNION ALL SELECT 'trade_total',    COUNT(*) FROM trade
UNION ALL SELECT 'trade_futures',  COUNT(*) FROM trade WHERE sub_asset='Future'
UNION ALL SELECT 'coupon_received',COUNT(*) FROM coupon_received
UNION ALL SELECT 'pnl_daily',      COUNT(*) FROM pnl_daily
UNION ALL SELECT 'tbill_position', COUNT(*) FROM tbill_position
UNION ALL SELECT 'external_pnl',   COUNT(*) FROM external_pnl_snapshot
UNION ALL SELECT 'audit_log',      COUNT(*) FROM audit_log
ORDER BY tbl;

COMMIT;
