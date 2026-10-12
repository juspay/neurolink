import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  type BoxProps,
  type ButtonProps,
} from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { useState, type ReactNode } from "react";
import type { BadgeTone, EngineId } from "../engine/types";
import { useThemeMode } from "./themeMode";

export function Surface({ sx, children, ...rest }: BoxProps) {
  const { vb } = useTheme();
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: `1px solid ${vb.line}`,
        borderRadius: "16px",
        boxShadow: vb.shadow,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function SectionHead({
  title,
  hint,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  const { vb } = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        flexWrap: "wrap",
        px: { xs: 2, sm: 2.5 },
        py: 1.75,
        borderBottom: `1px solid ${vb.line}`,
      }}
    >
      <Typography
        variant="h3"
        component="h3"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        {title}
      </Typography>
      {hint && (
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
        >
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

export function EngineDot({
  engine,
  size = 8,
}: {
  engine: EngineId;
  size?: number;
}) {
  const { vb } = useTheme();
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: vb.engine[engine],
        flex: "none",
        display: "inline-block",
      }}
    />
  );
}

export function EngineTag({
  engine,
  children,
}: {
  engine: EngineId;
  children: ReactNode;
}) {
  const { vb } = useTheme();
  const c = vb.engine[engine];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: "2px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: c,
        bgcolor: alpha(c, 0.1),
        border: `1px solid ${alpha(c, 0.28)}`,
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      <EngineDot engine={engine} size={6} />
      {children}
    </Box>
  );
}

export function Badge({
  tone = "",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const { vb } = useTheme();
  const map: Record<string, [string, string, string]> = {
    ok: [vb.ok, vb.okSoft, alpha(vb.ok, 0.3)],
    warn: [vb.warn, vb.warnSoft, alpha(vb.warn, 0.3)],
    busy: [vb.accentInk, vb.accentSoft, alpha(vb.accent, 0.3)],
    "": [vb.muted, "transparent", vb.line],
  };
  const [fg, bg, bd] = map[tone] ?? map[""];
  return (
    <Box
      component="span"
      className={tone === "busy" ? "vb-busy" : undefined}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.72rem",
        fontWeight: 500,
        px: 1,
        py: "1px",
        borderRadius: 999,
        color: fg,
        bgcolor: bg,
        border: `1px solid ${bd}`,
        whiteSpace: "nowrap",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Box>
  );
}

export function CopyButton({
  getText,
  label = "Copy",
  iconOnly = false,
  ...rest
}: { getText: () => string; label?: string; iconOnly?: boolean } & Omit<
  ButtonProps,
  "onClick"
>) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  if (iconOnly)
    return (
      <Tooltip
        title={
          state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : label
        }
      >
        <IconButton
          size="small"
          aria-label={label}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(getText());
              setState("ok");
            } catch {
              setState("fail");
            }
            setTimeout(() => setState("idle"), 1500);
          }}
        >
          {state === "ok" ? (
            <CheckRounded fontSize="small" />
          ) : (
            <ContentCopyRounded fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    );
  return (
    <Button
      {...rest}
      startIcon={
        state === "ok" ? (
          <CheckRounded fontSize="small" />
        ) : (
          <ContentCopyRounded fontSize="small" />
        )
      }
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setState("ok");
        } catch {
          setState("fail");
        }
        setTimeout(() => setState("idle"), 1500);
      }}
    >
      {state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : label}
    </Button>
  );
}

// Generated plates (Qwen-Image 2.1), one per theme; the mask melts the backdrop into the page.
export function Illustration({
  name,
  alt = "",
}: {
  name: string;
  alt?: string;
}) {
  const mode = useThemeMode();
  return (
    <img
      className="vb-illus"
      src={`illustrations/${name}-${mode}.webp`}
      srcSet={`illustrations/${name}-${mode}-960.webp 960w, illustrations/${name}-${mode}.webp 1536w`}
      sizes="(max-width: 900px) 100vw, 520px"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

export function PageHeader({
  title,
  children,
  art,
}: {
  title: string;
  children: ReactNode;
  art: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0,1fr) minmax(280px, 440px)",
        },
        alignItems: "center",
        gap: { xs: 1, md: 3 },
        minHeight: { md: 200 },
      }}
    >
      <Box sx={{ order: { xs: 2, md: 1 }, display: "grid", gap: 1.25 }}>
        <Typography variant="h2" component="h2">
          {title}
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            maxWidth: "62ch",
            fontSize: "0.975rem",
            lineHeight: 1.6,
          }}
        >
          {children}
        </Typography>
      </Box>
      <Box
        sx={{
          order: { xs: 1, md: 2 },
          height: { xs: 150, sm: 190, md: 220 },
          mx: { xs: -2, md: 0 },
        }}
      >
        <Illustration name={art} />
      </Box>
    </Box>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 1.5, md: 3 },
        pb: { xs: 12, md: 5 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1040,
          mx: "auto",
          display: "grid",
          gap: { xs: 2, md: 2.5 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
