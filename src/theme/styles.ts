// Shared accent button style
export const accentBtnSx = {
  borderColor: "#9cef3b",
  color: "#9cef3b",
  "&:hover": { borderColor: "#9cef3b", bgcolor: "rgba(156,239,59,0.08)" },
} as const;

// Chain toggle button group styles
export const chainToggleSx = {
  "& .MuiToggleButton-root": {
    minWidth: 120,
    textTransform: "none",
    fontWeight: 600,
    bgcolor: "action.hover",
    border: "none",
    color: "text.secondary",
    transition: "all 0.25s ease",
  },
  "& .MuiToggleButton-root.Mui-selected[value='eth']": {
    bgcolor: "#627eea !important",
    color: "#fff !important",
    borderColor: "#627eea !important",
    "&:hover": { bgcolor: "#4f6bd6 !important" },
  },
  "& .MuiToggleButton-root.Mui-selected[value='vara']": {
    bgcolor: "#9cef3b !important",
    color: "#000 !important",
    borderColor: "#9cef3b !important",
    "&:hover": { bgcolor: "#8ad635 !important" },
  },
} as const;
