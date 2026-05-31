// src/utils/formatters.js
// Complete formatting utilities - no calculations, pure display formatting

export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return "N/A";

  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCurrency = (amount, currency = "USD", compact = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "N/A";

  const absAmount = Math.abs(amount);

  if (compact) {
    if (absAmount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B ${currency}`;
    } else if (absAmount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currency}`;
    } else if (absAmount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K ${currency}`;
    }
  }

  return `${formatNumber(amount, 0)} ${currency}`;
};

export const formatPercentage = (value, decimals = 2, showSign = false) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";

  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatBasisPoints = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return `${formatNumber(value, decimals)} bp`;
};

export const formatDate = (dateStr, format = "short") => {
  if (!dateStr) return "N/A";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";

  switch (format) {
    case "short":
      return date.toLocaleDateString("en-US");
    case "long":
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "time":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    case "datetime":
      return `${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`;
    case "timeonly":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "iso":
      return date.toISOString();
    case "relative":
      return formatRelativeTime(date);
    default:
      return date.toLocaleDateString("en-US");
  }
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

export const formatDuration = (days) => {
  if (!days || isNaN(days)) return "N/A";

  if (days < 30) return `${days}D`;
  if (days < 365) return `${Math.round(days / 30)}M`;
  return `${(days / 365).toFixed(1)}Y`;
};

export const formatYield = (yield_, decimals = 2) => {
  if (yield_ === null || yield_ === undefined || isNaN(yield_)) return "N/A";
  return `${yield_.toFixed(decimals)}%`;
};

export const formatSpread = (spread, decimals = 0) => {
  if (spread === null || spread === undefined || isNaN(spread)) return "N/A";
  return `${spread.toFixed(decimals)} bp`;
};

export const formatPrice = (price, decimals = 3) => {
  if (price === null || price === undefined || isNaN(price)) return "N/A";
  return price.toFixed(decimals);
};

export const formatRating = (rating) => {
  if (!rating) return "N/A";
  return rating.toString().toUpperCase();
};

export const formatISIN = (isin) => {
  if (!isin) return "N/A";
  // Format ISIN with spaces for readability: XX1234567890 -> XX 1234567890
  if (isin.length === 12) {
    return `${isin.slice(0, 2)} ${isin.slice(2)}`;
  }
  return isin;
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return "N/A";
  // Basic phone formatting for international numbers
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatEmail = (email) => {
  if (!email) return "N/A";
  return email.toLowerCase();
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatTradeStatus = (status) => {
  const statusMap = {
    pending: "Pending",
    executed: "Executed",
    cancelled: "Cancelled",
    settled: "Settled",
    failed: "Failed",
  };
  return statusMap[status?.toLowerCase()] || status || "Unknown";
};

export const formatInstrumentType = (type) => {
  const typeMap = {
    eurobonds: "EuroBonds",
    cln: "Credit Linked Notes",
    egp: "EGP Bills",
    bonds: "Bonds",
    bills: "Bills",
  };
  return typeMap[type?.toLowerCase()] || type || "Unknown";
};

// Color classes for different value types
export const getValueColorClass = (value, type = "pnl") => {
  if (value === null || value === undefined || isNaN(value)) {
    return "text-gray-500";
  }

  switch (type) {
    case "pnl":
      if (value > 0) return "text-green-600";
      if (value < 0) return "text-red-600";
      return "text-gray-600";

    case "status":
      if (value === "active" || value === "connected" || value === "executed")
        return "text-green-600";
      if (
        value === "inactive" ||
        value === "disconnected" ||
        value === "cancelled"
      )
        return "text-red-600";
      if (value === "pending" || value === "connecting")
        return "text-amber-600";
      return "text-gray-600";

    case "spread":
      if (value > 200) return "text-red-600";
      if (value > 100) return "text-amber-600";
      return "text-green-600";

    case "rating":
      const ratingValue = typeof value === "string" ? value.toLowerCase() : "";
      if (ratingValue.startsWith("aaa") || ratingValue.startsWith("aa"))
        return "text-green-600";
      if (ratingValue.startsWith("a") || ratingValue.startsWith("bbb"))
        return "text-blue-600";
      if (ratingValue.startsWith("bb") || ratingValue.startsWith("b"))
        return "text-amber-600";
      return "text-red-600";

    case "change":
      if (value > 0) return "text-green-600";
      if (value < 0) return "text-red-600";
      return "text-gray-600";

    default:
      return "text-gray-600";
  }
};

// Background color classes for status badges
export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    pending: "bg-amber-100 text-amber-800",
    executed: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
    settled: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    connected: "bg-green-100 text-green-800",
    disconnected: "bg-red-100 text-red-800",
    connecting: "bg-amber-100 text-amber-800",
  };

  return statusClasses[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
};

// Icons for different value changes
export const getChangeIcon = (value) => {
  if (value > 0) return "↗";
  if (value < 0) return "↘";
  return "→";
};

// Format for export to Excel/CSV
export const formatForExport = (value, type = "number") => {
  if (value === null || value === undefined) return "";

  switch (type) {
    case "number":
      return Number(value);
    case "percent":
      return Number(value) / 100;
    case "date":
      return new Date(value);
    case "currency":
      return Number(value);
    case "text":
      return String(value);
    default:
      return String(value);
  }
};

// Truncate long text with ellipsis
export const truncateText = (text, maxLength = 50) => {
  if (!text) return "N/A";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Format large numbers with appropriate units
export const formatLargeNumber = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return "N/A";

  const absNum = Math.abs(num);
  if (absNum >= 1e12) return `${(num / 1e12).toFixed(decimals)}T`;
  if (absNum >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
  if (absNum >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
  if (absNum >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
  return num.toString();
};

// Format maturity time remaining
export const formatTimeToMaturity = (maturityDate) => {
  if (!maturityDate) return "N/A";

  const now = new Date();
  const maturity = new Date(maturityDate);
  const diffMs = maturity - now;

  if (diffMs < 0) return "Matured";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0)
    return `${diffYears}Y ${Math.floor((diffDays % 365) / 30)}M`;
  if (diffMonths > 0) return `${diffMonths}M ${diffDays % 30}D`;
  return `${diffDays}D`;
};

// Format trade size with appropriate currency
export const formatTradeSize = (size, currency = "USD") => {
  if (!size || isNaN(size)) return "N/A";
  return `${formatLargeNumber(size)} ${currency}`;
};

// Format Bloomberg field names to readable labels
export const formatBloombergField = (field) => {
  const fieldMap = {
    PX_LAST: "Last Price",
    PX_MID: "Mid Price",
    PX_BID: "Bid Price",
    PX_ASK: "Ask Price",
    YLD_YTM_MID: "Yield to Maturity",
    DUR_MID: "Duration",
    G_SPREAD_MID: "G-Spread",
    I_SPREAD_MID: "I-Spread",
    SECURITY_DES: "Description",
    CRNCY: "Currency",
    COUNTRY_ISO: "Country",
    INDUSTRY_SECTOR: "Sector",
  };

  return fieldMap[field] || field;
};

// Default export with all formatters
export default {
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatBasisPoints,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatYield,
  formatSpread,
  formatPrice,
  formatRating,
  formatISIN,
  formatPhoneNumber,
  formatEmail,
  formatFileSize,
  formatTradeStatus,
  formatInstrumentType,
  getValueColorClass,
  getStatusBadgeClass,
  getChangeIcon,
  formatForExport,
  truncateText,
  formatLargeNumber,
  formatTimeToMaturity,
  formatTradeSize,
  formatBloombergField,
};
