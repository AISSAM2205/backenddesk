// src/components/Dashboard/MainContent.jsx
import React from "react";
import { useTrading } from "../../contexts/TradingContext";
import EuroBondView from "../Instruments/EuroBonds/EuroBondView";
import CLNView from "../Instruments/CLN/CLNView";
import EGPView from "../Instruments/EGP/EGPView";
import PortfolioView from "../Instruments/Portfolio/PortfolioView";
import BlotterTable from "../Blotter/BlotterTable";
import RiskView from "../Risk/RiskView";
import FuturesView from "../Instruments/Futures/FuturesView";
import ReportingView from "../Reporting/ReportingView";
import TBillsView from "../Instruments/TBills/TBillsView";
import PricingView from "../Pricing/PricingView";

const MainContent = () => {
  const { activeInstrument } = useTrading();

  const renderContent = () => {
    switch (activeInstrument) {
      case "portfolio":
        return <PortfolioView />;
      case "eurobonds":
        return <EuroBondView />;
      case "risk":
        return <RiskView />;
      case "futures":
        return <FuturesView />;
      case "blotter":
        return <BlotterTable />;
      case "cln":
        return <CLNView />;
      case "egp":
        return <EGPView />;
      case "reporting":
        return <ReportingView />;
      case "tbills":
        return <TBillsView />;
      case "pricing":
        return <PricingView />;
      default:
        return <PortfolioView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
};

export default MainContent;
