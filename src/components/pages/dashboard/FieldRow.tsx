import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

export function FieldRow({
  label,
  value,
  placeholder,
  onCopy,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCopy: () => void;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      placeholder={placeholder}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={onCopy} edge="end" size="small" aria-label={`copy ${label}`}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
