import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { type SyntheticEvent, useState } from "react";
import { ClaimTab } from "./dashboard/ClaimTab";
import { ReceiveTab } from "./dashboard/ReceiveTab";
import { SendTab } from "./dashboard/SendTab";

export default function DashboardPage() {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs
        value={tab}
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
        {tab === 0 && <ReceiveTab />}
        {tab === 1 && <SendTab />}
        {tab === 2 && <ClaimTab />}
      </Box>
    </Box>
  );
}
