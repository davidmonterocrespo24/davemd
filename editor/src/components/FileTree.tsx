interface Props {
  files: string[];
  active: string | null;
  onSelect: (f: string) => void;
  onNew: () => void;
}

export default function FileTree({ files, active, onSelect, onNew }: Props) {
  return (
    <div style={{
      width: 220,
      borderRight: "1px solid #2d2d2d",
      padding: 12,
      overflowY: "auto",
      background: "#1e1e1e",
      color: "#ccc",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "#888" }}>Docs</strong>
        <button
          onClick={onNew}
          title="Nuevo archivo"
          style={{
            background: "none",
            border: "1px solid #444",
            color: "#ccc",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>
      {files.length === 0 && (
        <div style={{ color: "#555", fontSize: 12 }}>Sin archivos. Crea uno.</div>
      )}
      {files.map((f) => (
        <div
          key={f}
          onClick={() => onSelect(f)}
          style={{
            padding: "6px 8px",
            cursor: "pointer",
            borderRadius: 4,
            background: f === active ? "#2d4a7a" : "transparent",
            color: f === active ? "#fff" : "#bbb",
            marginBottom: 2,
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          {f}
        </div>
      ))}
    </div>
  );
}
