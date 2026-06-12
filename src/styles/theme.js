import { theme as antdTheme } from "antd";

/* ─────────────────────────────────────────────────────────────────────
   Shared structural tokens — same for both dark and light modes.
   These govern spacing, typography, motion, and border radius only.
   Color tokens are defined in darkTokens / lightTokens below.
───────────────────────────────────────────────────────────────────── */
const structural = {
  // Typography
  fontFamily: '"DM Sans", system-ui, sans-serif',
  fontFamilyCode: '"JetBrains Mono", "IBM Plex Mono", monospace',
  fontSize: 13,
  fontSizeSM: 11,
  fontSizeLG: 15,
  lineHeight: 1.5,
  lineHeightSM: 1.35,

  // Border radius — mirrors --r-xs / --r-sm / --r-md / --r-lg
  borderRadius: 3,
  borderRadiusSM: 3,
  borderRadiusLG: 8,
  borderRadiusXS: 2,

  // Spacing — mirrors 4px grid
  padding: 12,
  paddingSM: 8,
  paddingLG: 16,
  paddingXS: 4,
  paddingXXS: 4,
  marginXXS: 4,
  marginXS: 8,
  marginSM: 12,
  margin: 16,

  // Control heights (compact design)
  controlHeight: 28,
  controlHeightSM: 22,
  controlHeightLG: 36,
  controlHeightXS: 18,

  // Motion — matches transition values in index.css
  motionDurationSlow: "0.22s",
  motionDurationMid: "0.15s",
  motionDurationFast: "0.10s",
};

/* ─────────────────────────────────────────────────────────────────────
   Dark mode color tokens  (mirrors :root / html.dark in index.css)
───────────────────────────────────────────────────────────────────── */
const darkTokens = {
  // Brand — --cyan = AWB amber, primary action color
  colorPrimary: "#c8910c",
  colorPrimaryHover: "#d9a52e",
  colorPrimaryActive: "#b07a0a",
  colorPrimaryBg: "rgba(200,145,12,0.10)",
  colorPrimaryBgHover: "rgba(200,145,12,0.16)",
  colorPrimaryBorder: "rgba(200,145,12,0.30)",
  colorPrimaryBorderHover: "rgba(200,145,12,0.45)",
  colorPrimaryText: "#c8910c",
  colorPrimaryTextHover: "#d9a52e",
  colorPrimaryTextActive: "#b07a0a",

  // Semantic
  colorSuccess: "#00e899",
  colorSuccessBg: "rgba(0,232,153,0.10)",
  colorSuccessBorder: "rgba(0,232,153,0.25)",
  colorError: "#ff2b60",
  colorErrorBg: "rgba(255,43,96,0.10)",
  colorErrorBorder: "rgba(255,43,96,0.25)",
  colorWarning: "#ffa500",
  colorWarningBg: "rgba(255,165,0,0.10)",
  colorWarningBorder: "rgba(255,165,0,0.25)",
  colorInfo: "#00caff",
  colorInfoBg: "rgba(0,202,255,0.08)",
  colorInfoBorder: "rgba(0,202,255,0.22)",
  colorLink: "#00caff",
  colorLinkHover: "#33d6ff",
  colorLinkActive: "#009fcc",

  // Surfaces — --void → --over
  colorBgBase: "#010b18",
  colorBgLayout: "#050f1e",
  colorBgContainer: "#081829",
  colorBgElevated: "#0c1f3a",
  colorBgSpotlight: "#112d4e",
  colorBgMask: "rgba(1,11,24,0.75)",
  colorFillAlter: "rgba(8,24,41,0.5)",
  colorFillContent: "rgba(12,31,58,0.40)",
  colorFillContentHover: "rgba(12,31,58,0.65)",
  colorFill: "rgba(15,60,130,0.10)",
  colorFillSecondary: "rgba(15,60,130,0.06)",
  colorFillTertiary: "rgba(15,60,130,0.04)",
  colorFillQuaternary: "rgba(15,60,130,0.02)",

  // Text
  colorText: "#c5e0f5",
  colorTextSecondary: "#7aafce",
  colorTextTertiary: "#3d6885",
  colorTextQuaternary: "#3d6885",
  colorTextDisabled: "#3d6885",
  colorTextDescription: "#7aafce",
  colorTextPlaceholder: "#3d6885",
  colorTextHeading: "#c5e0f5",
  colorTextLabel: "#7aafce",

  // Borders — --b1 / --b2
  colorBorder: "rgba(15,60,130,0.28)",
  colorBorderSecondary: "rgba(15,60,130,0.18)",
  colorSplit: "rgba(15,60,130,0.18)",

  // Shadows
  boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
  boxShadowSecondary: "0 4px 20px rgba(0,0,0,0.40)",
  boxShadowTertiary: "0 1px 3px rgba(0,0,0,0.30)",
};

/* ─────────────────────────────────────────────────────────────────────
   Light mode color tokens  (mirrors html.light in index.css)
───────────────────────────────────────────────────────────────────── */
const lightTokens = {
  // Brand — --cyan light = #9e6a00
  colorPrimary: "#9e6a00",
  colorPrimaryHover: "#b87e00",
  colorPrimaryActive: "#7a5200",
  colorPrimaryBg: "rgba(158,106,0,0.08)",
  colorPrimaryBgHover: "rgba(158,106,0,0.14)",
  colorPrimaryBorder: "rgba(158,106,0,0.28)",
  colorPrimaryBorderHover: "rgba(158,106,0,0.42)",
  colorPrimaryText: "#9e6a00",
  colorPrimaryTextHover: "#b87e00",
  colorPrimaryTextActive: "#7a5200",

  // Semantic
  colorSuccess: "#00875a",
  colorSuccessBg: "rgba(0,135,90,0.08)",
  colorSuccessBorder: "rgba(0,135,90,0.22)",
  colorError: "#cf1e2b",
  colorErrorBg: "rgba(207,30,43,0.07)",
  colorErrorBorder: "rgba(207,30,43,0.20)",
  colorWarning: "#c27a00",
  colorWarningBg: "rgba(194,122,0,0.08)",
  colorWarningBorder: "rgba(194,122,0,0.22)",
  colorInfo: "#0080b5",
  colorInfoBg: "rgba(0,128,181,0.07)",
  colorInfoBorder: "rgba(0,128,181,0.20)",
  colorLink: "#0080b5",
  colorLinkHover: "#0099d6",
  colorLinkActive: "#006691",

  // Surfaces
  colorBgBase: "#eff3f8",
  colorBgLayout: "#f8fafb",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#edf1f7",
  colorBgSpotlight: "#e2e8f3",
  colorBgMask: "rgba(239,243,248,0.80)",
  colorFillAlter: "rgba(0,40,90,0.04)",
  colorFillContent: "rgba(0,60,140,0.06)",
  colorFillContentHover: "rgba(0,60,140,0.10)",
  colorFill: "rgba(0,40,90,0.05)",
  colorFillSecondary: "rgba(0,40,90,0.04)",
  colorFillTertiary: "rgba(0,40,90,0.02)",
  colorFillQuaternary: "rgba(0,40,90,0.01)",

  // Text
  colorText: "#0a1929",
  colorTextSecondary: "#1e3a5f",
  colorTextTertiary: "#526b8a",
  colorTextQuaternary: "#526b8a",
  colorTextDisabled: "#526b8a",
  colorTextDescription: "#1e3a5f",
  colorTextPlaceholder: "#526b8a",
  colorTextHeading: "#0a1929",
  colorTextLabel: "#1e3a5f",

  // Borders
  colorBorder: "rgba(0,60,140,0.17)",
  colorBorderSecondary: "rgba(0,40,90,0.10)",
  colorSplit: "rgba(0,40,90,0.10)",

  // Shadows
  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
  boxShadowSecondary: "0 4px 20px rgba(0,0,0,0.12)",
  boxShadowTertiary: "0 1px 3px rgba(0,0,0,0.08)",
};

/* ─────────────────────────────────────────────────────────────────────
   Component-level token overrides.
   Structural props are shared; color references pull from the token
   system (antd resolves them via the algorithm + seed tokens above).
───────────────────────────────────────────────────────────────────── */
const makeComponents = (dark) => {
  const t = dark ? darkTokens : lightTokens;

  return {
    Avatar: {
      backgrountdColor: t.colorBgElevated,
      borderRadius: 6,
    },
    Button: {
      // Display font for all buttons, matches .btn in index.css
      fontFamily: '"Syne", system-ui, sans-serif',
      fontSize: 9,
      fontWeight: 700,
      borderRadius: 3,
      borderRadiusSM: 2,
      // Default button — mirrors .btn-ghost
      defaultBg: "transparent",
      defaultBorderColor: t.colorBorderSecondary,
      defaultColor: t.colorTextSecondary,
      defaultHoverBg: t.colorBgContainer,
      defaultHoverBorderColor: t.colorBorder,
      defaultHoverColor: t.colorText,
      defaultActiveBg: t.colorBgContainer,
      defaultActiveBorderColor: t.colorBorder,
      defaultActiveColor: t.colorText,
      // Primary — mirrors .btn-primary (amber brand)
      colorPrimary: t.colorPrimary,
      colorPrimaryHover: t.colorPrimaryHover,
      colorPrimaryActive: t.colorPrimaryActive,
      primaryShadow: "none",
      // Danger — mirrors .btn-danger
      dangerShadow: "none",
      // Disabled
      colorTextDisabled: dark ? "rgba(61,104,133,0.5)" : "rgba(82,107,138,0.5)",
      borderColorDisabled: t.colorBorderSecondary,
    },

    Input: {
      colorBgContainer: dark ? "#050f1e" : "#ffffff",
      colorBorder: t.colorBorderSecondary,
      colorTextPlaceholder: t.colorTextPlaceholder,
      hoverBorderColor: t.colorBorder,
      activeBorderColor: dark ? "rgba(0,150,255,0.5)" : "rgba(0,100,220,0.4)",
      activeShadow: dark
        ? "0 0 0 3px rgba(0,202,255,0.08)"
        : "0 0 0 3px rgba(0,128,181,0.10)",
      errorActiveShadow: dark
        ? "0 0 0 3px rgba(255,43,96,0.10)"
        : "0 0 0 3px rgba(207,30,43,0.08)",
      borderRadius: 3,
      borderRadiusSM: 3,
      paddingBlock: 8,
      paddingInline: 12,
      paddingBlockSM: 4,
      paddingInlineSM: 8,
      fontSize: 12,
    },

    Select: {
      colorBgContainer: t.colorBgContainer,
      optionSelectedBg: t.colorBgElevated,
      optionActiveBg: t.colorFillContent,
      colorTextPlaceholder: t.colorTextPlaceholder,
      fontSize: 12,
      borderRadius: 3,
    },

    Modal: {
      contentBg: t.colorBgElevated,
      headerBg: t.colorBgElevated,
      footerBg: t.colorBgElevated,
      borderRadiusLG: 12,
      paddingContentHorizontalLG: 20,
      boxShadow: dark
        ? "0 24px 60px rgba(0,0,0,0.55)"
        : "0 24px 60px rgba(0,0,0,0.18)",
    },

    Tag: {
      defaultBg: t.colorBgElevated,
      defaultColor: t.colorTextSecondary,
      defaultBorderColor: t.colorBorderSecondary,
      fontSize: 9,
      borderRadius: 2,
    },

    Badge: {
      colorBgContainer: t.colorBgBase,
      fontSize: 9,
      fontWeight: 700,
    },

    Spin: {
      colorPrimary: t.colorPrimary,
    },

    Progress: {
      remainingColor: t.colorBorderSecondary,
      circleTextFontSize: "0.7em",
    },

    Card: {
      colorBgContainer: t.colorBgContainer,
      colorBorderSecondary: t.colorBorderSecondary,
      borderRadius: 5,
      paddingLG: 16,
      headerBg: "transparent",
      headerFontSize: 11,
      headerHeightSM: 32,
    },

    // NOTE : clé Table UNIQUE (un doublon écrasait silencieusement la 1re
    // définition — fusionné). Les fonds de tri sont fixés pour éviter le
    // surlignage par défaut d'antd sur les colonnes triées.
    Table: {
      colorBgContainer: "transparent",
      headerBg: t.colorBgLayout,
      headerColor: t.colorTextTertiary,
      headerSplitColor: "transparent",
      headerBorderRadius: 0,
      headerSortActiveBg: t.colorBgLayout,
      headerSortHoverBg: t.colorBgLayout,
      bodySortBg: "transparent",
      borderColor: t.colorBorderSecondary,
      rowHoverBg: dark ? "rgba(12,31,58,0.85)" : "rgba(0,60,140,0.07)",
      footerBg: "transparent",
      footerColor: t.colorTextSecondary,
      cellPaddingBlockSM: 5,
      cellPaddingInlineSM: 10,
      cellFontSizeSM: 12,
      fontSize: 12,
    },

    Tabs: {
      inkBarColor: t.colorPrimary,
      itemActiveColor: t.colorText,
      itemColor: t.colorTextSecondary,
      itemHoverColor: t.colorText,
      itemSelectedColor: t.colorText,
      cardBg: t.colorBgLayout,
      cardGutter: 2,
      titleFontSize: 11,
      horizontalItemGutter: 16,
    },

    Tooltip: {
      colorBgSpotlight: t.colorBgSpotlight,
      borderRadius: 5,
      fontSize: 11,
    },

    Divider: {
      colorSplit: t.colorSplit,
      colorText: t.colorTextTertiary,
      fontSize: 11,
    },

    Dropdown: {
      colorBgElevated: t.colorBgElevated,
      controlItemBgActive: t.colorBgSpotlight,
      controlItemBgHover: t.colorFillContent,
      borderRadius: 5,
    },

    Form: {
      labelColor: t.colorTextSecondary,
      labelFontSize: 10,
      verticalLabelPadding: "0 0 4px",
      itemMarginBottom: 16,
    },

    Drawer: {
      colorBgElevated: t.colorBgElevated,
    },

    Alert: {
      colorInfoBg: t.colorInfoBg,
      colorInfoBorder: t.colorInfoBorder,
      colorSuccessBg: t.colorSuccessBg,
      colorSuccessBorder: t.colorSuccessBorder,
      colorErrorBg: t.colorErrorBg,
      colorErrorBorder: t.colorErrorBorder,
      colorWarningBg: t.colorWarningBg,
      colorWarningBorder: t.colorWarningBorder,
      borderRadius: 3,
      fontSize: 12,
    },

    Notification: {
      colorBgElevated: t.colorBgElevated,
    },

    Empty: {
      colorText: t.colorTextSecondary,
      colorTextDescription: t.colorTextTertiary,
    },

    Pagination: {
      colorBgContainer: "transparent",
      fontSize: 11,
    },

    DatePicker: {
      colorBgContainer: dark ? "#050f1e" : "#ffffff",
      colorBgElevated: t.colorBgElevated,
      hoverBorderColor: t.colorBorder,
      activeBorderColor: dark ? "rgba(0,150,255,0.5)" : "rgba(0,100,220,0.4)",
      activeShadow: dark
        ? "0 0 0 3px rgba(0,202,255,0.08)"
        : "0 0 0 3px rgba(0,128,181,0.10)",
      borderRadius: 3,
      fontSize: 12,
    },

    Checkbox: {
      colorBgContainer: "transparent",
      borderRadius: 2,
    },

    Switch: {
      colorPrimary: t.colorPrimary,
      colorPrimaryHover: t.colorPrimaryHover,
    },

    Statistic: {
      contentFontSize: 22,
      titleFontSize: 10,
      fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace',
    },

    Typography: {
      colorLink: t.colorLink,
      colorLinkHover: t.colorLinkHover,
    },

    Menu: {
      itemBg: "transparent",
      subMenuItemBg: t.colorBgLayout,
      popupBg: t.colorBgElevated,
      itemSelectedBg: t.colorPrimaryBg,
      itemHoverBg: t.colorFillContent,
      itemSelectedColor: t.colorPrimary,
      itemColor: t.colorTextSecondary,
      itemHoverColor: t.colorText,
      iconSize: 13,
      itemHeight: 32,
    },
  };
};

/* ─────────────────────────────────────────────────────────────────────
   Exported theme configs
───────────────────────────────────────────────────────────────────── */
export const darkTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: { ...structural, ...darkTokens },
  components: makeComponents(true),
};

export const lightTheme = {
  algorithm: antdTheme.defaultAlgorithm,
  token: { ...structural, ...lightTokens },
  components: makeComponents(false),
};

// Legacy default export — dark (matches app default)
export const theme = darkTheme;
