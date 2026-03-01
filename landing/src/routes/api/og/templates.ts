function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OGType = "home" | "docs" | "sdk" | "examples";

interface OGParams {
  type: OGType;
  title?: string;
  subtitle?: string;
  section?: string;
  method?: string;
}

const COLORS = {
  bg: "#0a0a0a",
  blue: "#016fb9",
  orange: "#ff9505",
  text: "#fafafa",
  muted: "#94A3B8",
  border: "#1e1e1e",
} as const;

function wrap(inner: string): string {
  return `<div style="display:flex;flex-direction:column;width:1200px;height:630px;background:${COLORS.bg};padding:60px;font-family:Inter,sans-serif;">${inner}</div>`;
}

function logoBar(): string {
  return `<div style="display:flex;align-items:center;gap:16px;margin-bottom:40px;">
    <div style="display:flex;width:48px;height:48px;border-radius:12px;background:${COLORS.blue};align-items:center;justify-content:center;">
      <div style="display:flex;color:white;font-size:28px;font-weight:700;">N</div>
    </div>
    <div style="display:flex;font-size:28px;font-weight:700;color:${COLORS.text};">Neuro<span style="color:${COLORS.orange};">Link</span></div>
  </div>`;
}

function footerBar(): string {
  return `<div style="display:flex;margin-top:auto;align-items:center;justify-content:space-between;">
    <div style="display:flex;font-size:18px;color:${COLORS.muted};">neurolink.ink</div>
    <div style="display:flex;font-size:16px;color:${COLORS.muted};">The Complete TypeScript AI SDK</div>
  </div>`;
}

function homeTemplate(): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;font-size:56px;font-weight:700;color:${COLORS.text};line-height:1.1;margin-bottom:20px;">The Complete TypeScript AI SDK</div>
      <div style="display:flex;font-size:24px;color:${COLORS.muted};line-height:1.4;">13+ Providers · RAG · MCP · Agents · Voice · 50+ File Types</div>
    </div>
    ${footerBar()}
  `);
}

function docsTemplate(title: string, section: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="display:flex;font-size:18px;color:${COLORS.blue};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(section)}</div>
      </div>
      <div style="display:flex;font-size:52px;font-weight:700;color:${COLORS.text};line-height:1.15;">${escapeHtml(title)}</div>
    </div>
    ${footerBar()}
  `);
}

function sdkTemplate(method: string, subtitle: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;font-size:18px;color:${COLORS.blue};font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">SDK Reference</div>
      <div style="display:flex;padding:24px 32px;background:#141414;border:1px solid ${COLORS.border};border-radius:12px;margin-bottom:20px;">
        <div style="display:flex;font-size:40px;font-weight:600;color:${COLORS.orange};font-family:monospace;">${escapeHtml(method)}</div>
      </div>
      <div style="display:flex;font-size:22px;color:${COLORS.muted};line-height:1.4;">${escapeHtml(subtitle)}</div>
    </div>
    ${footerBar()}
  `);
}

function examplesTemplate(title: string, subtitle: string): string {
  return wrap(`
    ${logoBar()}
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="display:flex;width:32px;height:32px;border-radius:8px;background:${COLORS.orange};align-items:center;justify-content:center;">
          <div style="display:flex;color:white;font-size:18px;">&#9654;</div>
        </div>
        <div style="display:flex;font-size:18px;color:${COLORS.orange};font-weight:600;text-transform:uppercase;letter-spacing:2px;">Example</div>
      </div>
      <div style="display:flex;font-size:48px;font-weight:700;color:${COLORS.text};line-height:1.15;margin-bottom:16px;">${escapeHtml(title)}</div>
      <div style="display:flex;font-size:22px;color:${COLORS.muted};line-height:1.4;">${escapeHtml(subtitle)}</div>
    </div>
    ${footerBar()}
  `);
}

export function getTemplate(params: OGParams): string {
  switch (params.type) {
    case "home":
      return homeTemplate();
    case "docs":
      return docsTemplate(
        params.title || "Documentation",
        params.section || "Docs",
      );
    case "sdk":
      return sdkTemplate(
        params.method || "generate()",
        params.subtitle || "Unified API for 13+ AI providers",
      );
    case "examples":
      return examplesTemplate(
        params.title || "Code Examples",
        params.subtitle || "Production-ready patterns and recipes",
      );
    default:
      return homeTemplate();
  }
}
