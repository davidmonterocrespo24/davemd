interface Heading { line: number; level: number; text: string }

interface Props {
  content: string;
  onGoToLine: (line: number) => void;
}

function parseHeadings(content: string): Heading[] {
  return content.split("\n").flatMap((raw, i) => {
    const m = raw.match(/^(#{1,3})\s+(.+)/);
    if (!m) return [];
    return [{ line: i + 1, level: m[1].length, text: m[2].trim() }];
  });
}

export default function Outline({ content, onGoToLine }: Props) {
  const headings = parseHeadings(content);
  if (headings.length === 0) return null;

  return (
    <div style={{
      width: 200, flexShrink: 0,
      borderLeft: "1px solid #2d2d2d",
      background: "#1e1e1e",
      overflowY: "auto",
      padding: "12px 0",
    }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
        color: "#555", paddingLeft: 12, marginBottom: 8,
      }}>
        Esquema
      </div>
      {headings.map((h) => (
        <div
          key={h.line}
          onClick={() => onGoToLine(h.line)}
          title={h.text}
          style={{
            paddingLeft: 8 + (h.level - 1) * 10,
            paddingRight: 8, paddingTop: 3, paddingBottom: 3,
            fontSize: 12, color: "#888", cursor: "pointer",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            borderLeft: "2px solid transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#ccc";
            (e.currentTarget as HTMLElement).style.borderLeftColor = "#4ec9b0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#888";
            (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
          }}
        >
          {h.text}
        </div>
      ))}
    </div>
  );
}
