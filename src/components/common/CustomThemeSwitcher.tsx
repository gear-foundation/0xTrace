import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import IconButton, { type IconButtonOwnProps } from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";

export default function CustomThemeSwitcher(props: IconButtonOwnProps) {
  const { mode, systemMode, setMode } = useColorScheme();

  if (!mode) {
    return null;
  }

  const resolved = mode === "system" ? systemMode : mode;

  const toggle = () => {
    setMode(resolved === "dark" ? "light" : "dark");
  };

  return (
    <IconButton onClick={toggle} sx={{ color: "inherit" }} {...props}>
      {resolved === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
}
