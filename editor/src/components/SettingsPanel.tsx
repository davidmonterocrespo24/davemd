import type { EditorConfig } from "../types";

interface Props {
  config: EditorConfig;
  onSave: (config: EditorConfig) => void;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #2d2d2d" }}>
      <span style={{ color: "#bbb", fontSize: 13 }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: value ? "#4ec9b0" : "#555",
        position: "relative", transition: "background 150ms",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 150ms",
      }} />
    </button>
  );
}

export default function SettingsPanel({ config, onSave, onClose }: Props) {
  function update<K extends keyof EditorConfig>(key: K, value: EditorConfig[K]) {
    onSave({ ...config, [key]: value });
  }

  const fontSizeNum = parseInt(config.fontSize) || 14;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.3)" }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
        zIndex: 401, background: "#252526",
        borderLeft: "1px solid #2d2d2d",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #2d2d2d" }}>
          <span style={{ color: "#d4d4d4", fontWeight: 600, fontSize: 14 }}>Configuración</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Options */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          <Row label="Tema">
            <button
              onClick={() => update("theme", config.theme === "vs-dark" ? "vs" : "vs-dark")}
              style={{
                background: "#3d3d3d", border: "1px solid #555",
                color: "#ccc", borderRadius: 4, cursor: "pointer",
                padding: "3px 10px", fontSize: 12,
              }}
            >
              {config.theme === "vs-dark" ? "Oscuro" : "Claro"}
            </button>
          </Row>

          <Row label={`Tamaño de fuente: ${fontSizeNum}px`}>
            <input
              type="range" min={10} max={24} step={1}
              value={fontSizeNum}
              onChange={(e) => update("fontSize", `${e.target.value}px`)}
              style={{ width: 100, accentColor: "#4ec9b0" }}
            />
          </Row>

          <Row label="Números de línea">
            <Toggle value={config.lineNumbers} onChange={(v) => update("lineNumbers", v)} />
          </Row>

          <Row label="Ajuste de línea">
            <Toggle value={config.lineWrapping} onChange={(v) => update("lineWrapping", v)} />
          </Row>

          <Row label="Tamaño de tab">
            <div style={{ display: "flex", gap: 4 }}>
              {[2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => { update("tabSize", n); update("indentUnit", n); }}
                  style={{
                    background: config.tabSize === n ? "#4ec9b0" : "#3d3d3d",
                    color: config.tabSize === n ? "#000" : "#ccc",
                    border: "none", borderRadius: 4,
                    padding: "3px 10px", cursor: "pointer", fontSize: 12,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Auto-cerrar brackets">
            <Toggle value={config.autoCloseBrackets} onChange={(v) => update("autoCloseBrackets", v)} />
          </Row>

          <Row label="Resaltar línea activa">
            <Toggle value={config.styleActiveLine} onChange={(v) => update("styleActiveLine", v)} />
          </Row>
        </div>
      </div>
    </>
  );
}
