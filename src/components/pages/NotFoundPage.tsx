import { Box, Typography } from "@mui/material";

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        gap: 3,
        p: 4,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 600,
          color: "text.primary",
          mb: 1,
        }}
      >
        Oops! Page Not Found
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          maxWidth: 400,
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        Apologies, but the page you were looking for wasn't found. Try using the buttons on the navigation bar to find
        another page.
      </Typography>
    </Box>
  );
}
