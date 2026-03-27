import { useState, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task { path: string; name: string; num: number }
interface Column { name: string; color: string; tasks: Task[] }

const COL_COLORS = ["#3fb950", "#f0a020", "#58a6ff", "#bc8cff", "#8b8b8b", "#e05252", "#4ec9b0"];

interface Props {
  projectPath: string;
  columns: string[];
  files: string[];
  onSelectTask: (path: string) => void;
  onCreateTask: (column: string, taskName: string) => void;
  onMoveTask: (taskPath: string, toColumn: string) => void;
  onDeleteTask: (path: string) => void;
  onAddColumn: (name: string) => void;
  onDeleteColumn: (name: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildColumns(projectPath: string, columnNames: string[], files: string[]): Column[] {
  let globalNum = 0;
  return columnNames.map((name, i) => {
    const prefix = `${projectPath}/${name}/`;
    const tasks = files
      .filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes("/") && f.endsWith(".md"))
      .map((f) => ({
        path: f,
        name: f.slice(prefix.length).replace(/\.md$/, ""),
        num: ++globalNum,
      }));
    return { name, tasks, color: COL_COLORS[i % COL_COLORS.length] };
  });
}

// ── Inline input ──────────────────────────────────────────────────────────────

function InlineInput({ placeholder, onConfirm, onCancel }: {
  placeholder: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState("");
  const done = useRef(false);

  function commit() {
    if (done.current) return;
    done.current = true;
    const v = val.trim();
    if (v) onConfirm(v);
    else onCancel();
  }

  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { done.current = true; onCancel(); }
      }}
      onBlur={commit}
      style={{
        width: "100%", background: "none", border: "none", outline: "none",
        color: "#d4d4d4", fontSize: 13, padding: 0,
      }}
    />
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function KanbanCard({ task, onOpen, onDelete, onDragStart }: {
  task: Task;
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#252526",
        borderRadius: 6,
        padding: "10px 12px",
        cursor: "pointer",
        border: `1px solid ${hovered ? "#4ec9b0" : "#333"}`,
        transition: "border-color 120ms",
        position: "relative",
        userSelect: "none",
      }}
    >
      <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>#{task.num}</div>
      <div style={{ color: "#d4d4d4", fontSize: 13, lineHeight: 1.4 }}>{task.name}</div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar tarea"
          style={{
            position: "absolute", top: 6, right: 6,
            background: "none", border: "none", color: "#666",
            cursor: "pointer", fontSize: 12, lineHeight: 1,
            padding: "2px 4px", borderRadius: 3,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f48771"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#666"; }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({ col, creating, onStartCreate, onCancelCreate, onConfirmCreate, onDelete, onSelectTask, onDeleteTask, dragOverCol, onDragOver, onDragLeave, onDrop, onDragStartTask }: {
  col: Column;
  creating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onConfirmCreate: (name: string) => void;
  onDelete: () => void;
  onSelectTask: (path: string) => void;
  onDeleteTask: (path: string) => void;
  dragOverCol: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStartTask: (path: string, e: React.DragEvent) => void;
}) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(e); }}
      style={{
        width: 270,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 6px 10px", position: "relative",
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: col.color, flexShrink: 0, marginRight: 2,
        }} />
        <span style={{ color: "#ccc", fontWeight: 600, fontSize: 13, flex: 1 }}>{col.name}</span>
        <span style={{
          background: "#2d2d2d", color: "#888", fontSize: 11,
          borderRadius: 10, padding: "2px 8px", fontVariantNumeric: "tabular-nums",
        }}>
          {col.tasks.length}
        </span>

        {/* Column menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenuPos(menuPos ? null : { x: rect.left, y: rect.bottom + 4 });
          }}
          style={{
            background: "none", border: "none", color: "#555",
            cursor: "pointer", fontSize: 13, padding: "0 3px", lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#999"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
        >···</button>

        <button
          onClick={onStartCreate}
          style={{
            background: "none", border: "none", color: "#555",
            cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#999"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
          title="Nueva tarea"
        >+</button>

        {/* Dropdown menu */}
        {menuPos && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 200 }}
              onClick={() => setMenuPos(null)}
            />
            <div style={{
              position: "fixed", top: menuPos.y, left: menuPos.x, zIndex: 201,
              background: "#2d2d2d", border: "1px solid #444",
              borderRadius: 6, padding: "4px 0", minWidth: 160,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}>
              <button
                onMouseDown={() => { setMenuPos(null); onDelete(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: "none", border: "none",
                  padding: "7px 14px", cursor: "pointer",
                  fontSize: 13, color: "#f48771",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#3d3d3d"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >Eliminar columna</button>
            </div>
          </>
        )}
      </div>

      {/* Drop zone indicator */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px",
        borderRadius: 8,
        minHeight: 80,
        background: dragOverCol ? "#1a3a2a" : "#1a1a1a",
        border: `1px solid ${dragOverCol ? "#3fb950" : "#222"}`,
        transition: "background 120ms, border-color 120ms",
      }}>
        {col.tasks.map((task) => (
          <KanbanCard
            key={task.path}
            task={task}
            onOpen={() => onSelectTask(task.path)}
            onDelete={() => onDeleteTask(task.path)}
            onDragStart={(e) => onDragStartTask(task.path, e)}
          />
        ))}

        {/* Inline creation */}
        {creating && (
          <div style={{
            background: "#252526", borderRadius: 6, padding: "10px 12px",
            border: "1px solid #4ec9b0",
          }}>
            <InlineInput
              placeholder="Nombre de la tarea..."
              onConfirm={onConfirmCreate}
              onCancel={onCancelCreate}
            />
          </div>
        )}

        {/* Add task button */}
        {!creating && (
          <button
            onClick={onStartCreate}
            style={{
              background: "none", border: "none", color: "#444",
              cursor: "pointer", padding: "6px 0", fontSize: 12,
              display: "flex", alignItems: "center", gap: 5,
              borderRadius: 4, width: "100%",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#777"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#444"; }}
          >
            <span style={{ fontSize: 14 }}>+</span> Nueva tarea
          </button>
        )}
      </div>
    </div>
  );
}

// ── KanbanBoard root ──────────────────────────────────────────────────────────

export default function KanbanBoard({
  projectPath, columns, files,
  onSelectTask, onCreateTask, onMoveTask, onDeleteTask, onAddColumn, onDeleteColumn,
}: Props) {
  const [filter, setFilter] = useState("");
  const [creatingInCol, setCreatingInCol] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const draggedTaskRef = useRef<string | null>(null);

  const allColumns = useMemo(
    () => buildColumns(projectPath, columns, files),
    [projectPath, columns, files]
  );

  const displayColumns = useMemo(() => {
    if (!filter) return allColumns;
    const q = filter.toLowerCase();
    return allColumns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.name.toLowerCase().includes(q)),
    }));
  }, [allColumns, filter]);

  const totalTasks = allColumns.reduce((n, c) => n + c.tasks.length, 0);

  function handleDragStartTask(path: string, e: React.DragEvent) {
    draggedTaskRef.current = path;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", path);
  }

  function handleDrop(colName: string) {
    const from = draggedTaskRef.current;
    draggedTaskRef.current = null;
    setDragOverCol(null);
    if (!from) return;
    // Extract current column from path: projectPath/ColName/task.md
    const parts = from.split("/");
    const fromCol = parts[parts.length - 2]; // second to last = column folder
    if (fromCol !== colName) {
      onMoveTask(from, colName);
    }
  }

  return (
    <div
      style={{
        display: "flex", flexDirection: "column",
        height: "100%", background: "#1e1e1e", overflow: "hidden",
      }}
      onClick={() => {/* close menus on outside click */}}
    >
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px", borderBottom: "1px solid #2d2d2d",
        background: "#252526", flexShrink: 0,
      }}>
        <span style={{ color: "#555", fontSize: 14, flexShrink: 0 }}>🔍</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre..."
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: "#d4d4d4", fontSize: 13,
          }}
        />
        <span style={{ color: "#555", fontSize: 12, flexShrink: 0, whiteSpace: "nowrap" }}>
          {totalTasks} tarea{totalTasks !== 1 ? "s" : ""} · {columns.length} columna{columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Board */}
      <div style={{
        flex: 1, display: "flex", gap: 12,
        padding: "20px", overflowX: "auto", overflowY: "hidden",
        alignItems: "flex-start",
      }}>
        {displayColumns.map((col) => (
          <KanbanColumn
            key={col.name}
            col={col}
            creating={creatingInCol === col.name}
            onStartCreate={() => setCreatingInCol(col.name)}
            onCancelCreate={() => setCreatingInCol(null)}
            onConfirmCreate={(name) => {
              onCreateTask(col.name, name);
              setCreatingInCol(null);
            }}
            onDelete={() => onDeleteColumn(col.name)}
            onSelectTask={onSelectTask}
            onDeleteTask={onDeleteTask}
            dragOverCol={dragOverCol === col.name}
            onDragOver={() => setDragOverCol(col.name)}
            onDragLeave={() => setDragOverCol((d) => d === col.name ? null : d)}
            onDrop={() => handleDrop(col.name)}
            onDragStartTask={handleDragStartTask}
          />
        ))}

        {/* Add column */}
        <div style={{ flexShrink: 0, width: 230, paddingTop: 0 }}>
          {addingCol ? (
            <div style={{
              background: "#252526", borderRadius: 8, padding: "12px",
              border: "1px solid #4ec9b0",
            }}>
              <InlineInput
                placeholder="Nombre de columna..."
                onConfirm={(name) => { onAddColumn(name); setAddingCol(false); }}
                onCancel={() => setAddingCol(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              style={{
                width: "100%", background: "none",
                border: "1px dashed #333", borderRadius: 8, color: "#555",
                cursor: "pointer", padding: "12px 16px", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
                transition: "border-color 120ms, color 120ms",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "#555"; el.style.color = "#888";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "#333"; el.style.color = "#555";
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> Nueva columna
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
