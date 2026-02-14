import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { AlertColor } from "@mui/material/Alert";
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { createContext, type ReactNode, useCallback, useMemo, useState } from "react";

type AlertOptions = {
  duration?: number;
};

type AlertContextType = {
  success: (message: string, options?: AlertOptions) => void;
  error: (message: string, options?: AlertOptions) => void;
  warning: (message: string, options?: AlertOptions) => void;
  info: (message: string, options?: AlertOptions) => void;
};

export const AlertContext = createContext<AlertContextType>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

const DEFAULT_DURATION = 3000;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("success");
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  const show = useCallback((s: AlertColor, msg: string, options?: AlertOptions) => {
    setMessage(msg);
    setSeverity(s);
    setDuration(options?.duration ?? DEFAULT_DURATION);
    setOpen(true);
  }, []);

  const handleClose = useCallback((_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      success: (msg: string, opts?: AlertOptions) => show("success", msg, opts),
      error: (msg: string, opts?: AlertOptions) => show("error", msg, opts),
      warning: (msg: string, opts?: AlertOptions) => show("warning", msg, opts),
      info: (msg: string, opts?: AlertOptions) => show("info", msg, opts),
    }),
    [show],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MuiAlert
          onClose={handleClose}
          severity={severity}
          variant="outlined"
          iconMapping={{
            success: <CheckCircleOutlineIcon sx={{ color: "#00FFC4" }} />,
            error: <ErrorOutlineIcon sx={{ color: "#f44336" }} />,
            warning: <WarningAmberIcon sx={{ color: "#ffa726" }} />,
            info: <InfoOutlinedIcon sx={{ color: "#627EEA" }} />,
          }}
          sx={{
            width: "100%",
            bgcolor: "rgb(32, 32, 32)",
            color: "#fff",
            borderColor: "rgba(255,255,255,0.12)",
            "& .MuiAlert-action .MuiIconButton-root": { color: "rgba(255,255,255,0.7)" },
          }}
        >
          {message}
        </MuiAlert>
      </Snackbar>
    </AlertContext.Provider>
  );
}
