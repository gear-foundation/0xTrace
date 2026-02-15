import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ClaimTab } from "./dashboard/ClaimTab";
import { ReceiveTab } from "./dashboard/ReceiveTab";
import { SendTab } from "./dashboard/SendTab";

const TAB_KEYS = ["receive", "send", "claim"] as const;

export default function DashboardPage() {
  const { tab } = useSearch({ from: "/_layout/" });
  const navigate = useNavigate({ from: "/" });

  const tabIndex = Math.max(0, TAB_KEYS.indexOf(tab ?? "receive"));

  const handleTabChange = (_: unknown, newValue: number) => {
    navigate({ search: { tab: TAB_KEYS[newValue] }, replace: true });
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="fullWidth"
        TabIndicatorProps={{ sx: { bgcolor: "#9cef3b" } }}
        sx={{ "& .Mui-selected": { color: "#9cef3b !important" } }}
      >
        <Tab icon={<CallReceivedIcon />} label="Receive" iconPosition="start" />
        <Tab icon={<CallMadeIcon />} label="Send" iconPosition="start" />
        <Tab icon={<SearchIcon />} label="Claim" iconPosition="start" />
      </Tabs>

      <Box sx={{ pt: 1 }}>
        {tabIndex === 0 && <ReceiveTab />}
        {tabIndex === 1 && <SendTab />}
        {tabIndex === 2 && <ClaimTab />}
      </Box>
    </Box>
  );
}
