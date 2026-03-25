import { useState, useRef } from "react";
import type { TreeNode } from "../types";
import { buildTree } from "../treeUtils";

interface Props {
  files: string[];
  active: string | null;
  onSelect: (path: string) => void;
  onNewFile: (parentPath: string | null, name: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string, kind: "file" | "folder") => void;
}

interface CreatingState {
  parentPath: string | null;
}

interface EditingState {
  path: string;
  currentName: string;
}

interface MenuState {
  path: string;
  x: number;
  y: number;
}

// ── Inline create input ────────────────────────────────────────────────────────

function NewItemRow({ depth, onConfirm, onCancel }: {
  depth: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div style={{
      display: "flex", alignItems: "center",
      paddingLeft: depth * 16 + 6, paddingTop: 3, paddingBottom: 3, paddingRight: 4,
    }}>
      <span style={{ width: 14, flexShrink: 0 }} />
      <span style={{ marginRight: 5, fontSize: 13, flexShrink: 0 }}>📄</span>
      <input
        autoFocus
        value={value}
        placeholder="nombre-archivo"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const trimmed = value.trim();
            if (trimmed) onConfirm(trimmed);
            else onCancel();
          }
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        style={inlineInputStyle}
      />
    </div>
  );
}

// ── Inline rename input ────────────────────────────────────────────────────────

function InlineEdit({ currentName, onConfirm, onCancel }: {
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentName);
  const done = useRef(false);

  function commit() {
    if (done.current) return;
    done.current = true;
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) onConfirm(trimmed);
    else onCancel();
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { done.current = true; onCancel(); }
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      style={{ ...inlineInputStyle, flex: 1 }}
    />
  );
}

const inlineInputStyle: React.CSSProperties = {
  background: "#2d2d2d",
  border: "1px solid #555",
  borderRadius: 3,
  color: "#d4d4d4",
  padding: "1px 5px",
  fontSize: 13,
  outline: "none",
  flex: 1,
  minWidth: 0,
};

// ── Context menu ───────────────────────────────────────────────────────────────

interface MenuItemDef { label: string; danger?: boolean; action: () => void }

function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number;
  items: MenuItemDef[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", top: y, left: x, zIndex: 200,
        background: "#2d2d2d", border: "1px solid #444", borderRadius: 6,
        padding: "4px 0", minWidth: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onMouseDown={(e) => { e.preventDefault(); item.action(); onClose(); }}
          style={{
            display: "block", width: "100%", textAlign: "left",
            background: "none", border: "none", padding: "7px 14px",
            cursor: "pointer", fontSize: 13,
            color: item.danger ? "#f48771" : "#ccc",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#3d3d3d"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── Tree node row ──────────────────────────────────────────────────────────────

interface RowProps {
  node: TreeNode;
  depth: number;
  active: string | null;
  collapsed: Set<string>;
  hovered: string | null;
  editing: EditingState | null;
  creating: CreatingState | null;
  onToggleCollapse: (path: string) => void;
  onSetHovered: (path: string | null) => void;
  onSelect: (path: string) => void;
  onOpenMenu: (path: string, e: React.MouseEvent) => void;
  onPlusClick: (parentPath: string | null) => void;
  onCommitRename: (oldPath: string, newName: string) => void;
  onCancelEdit: () => void;
  onCommitCreate: (name: string) => void;
  onCancelCreate: () => void;
  parentPath: string | null;
}

function TreeNodeRow({
  node, depth, active, collapsed, hovered, editing, creating,
  onToggleCollapse, onSetHovered, onSelect, onOpenMenu, onPlusClick,
  onCommitRename, onCancelEdit, onCommitCreate, onCancelCreate, parentPath,
}: RowProps) {
  const isFolder = node.kind === "folder";
  const isCollapsed = isFolder && collapsed.has(node.path);
  const isActive = !isFolder && active === node.path;
  const isHovered = hovered === node.path;
  const isEditing = editing?.path === node.path;
  const showNewChild = isFolder && !isCollapsed && creating?.parentPath === node.path;

  function handleRowClick(e: React.MouseEvent) {
    if (isEditing) return;
    e.stopPropagation();
    if (isFolder) onToggleCollapse(node.path);
    else onSelect(node.path);
  }

  const plusTarget = isFolder ? node.path : parentPath;

  return (
    <>
      <div
        onMouseEnter={() => onSetHovered(node.path)}
        onMouseLeave={() => onSetHovered(null)}
        onClick={handleRowClick}
        style={{
          display: "flex", alignItems: "center",
          paddingLeft: depth * 16 + 6, paddingRight: 4,
          paddingTop: 4, paddingBottom: 4,
          cursor: isEditing ? "default" : "pointer",
          borderRadius: 4,
          background: isActive ? "#2d4a7a" : isHovered ? "#2a2a2a" : "transparent",
          color: isActive ? "#fff" : "#bbb",
          fontSize: 13, userSelect: "none",
        }}
      >
        {/* Arrow */}
        <span style={{ width: 14, flexShrink: 0, color: "#666", fontSize: 10, marginRight: 2 }}>
          {isFolder ? (isCollapsed ? "▶" : "▼") : ""}
        </span>

        {/* Icon */}
        <span style={{ marginRight: 5, fontSize: 13, flexShrink: 0 }}>
          {isFolder ? "📁" : "📄"}
        </span>

        {/* Name or inline edit */}
        {isEditing ? (
          <InlineEdit
            currentName={node.name}
            onConfirm={(newName) => onCommitRename(node.path, newName)}
            onCancel={onCancelEdit}
          />
        ) : (
          <>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.name}
            </span>
            {isHovered && (
              <span style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: 4 }}>
                <ActionBtn
                  title="Nuevo documento"
                  onClick={(e) => { e.stopPropagation(); onPlusClick(plusTarget); }}
                >+</ActionBtn>
                <ActionBtn
                  title="Más opciones"
                  onClick={(e) => { e.stopPropagation(); onOpenMenu(node.path, e); }}
                >···</ActionBtn>
              </span>
            )}
          </>
        )}
      </div>

      {/* Children */}
      {isFolder && !isCollapsed && (
        <>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              active={active}
              collapsed={collapsed}
              hovered={hovered}
              editing={editing}
              creating={creating}
              onToggleCollapse={onToggleCollapse}
              onSetHovered={onSetHovered}
              onSelect={onSelect}
              onOpenMenu={onOpenMenu}
              onPlusClick={onPlusClick}
              onCommitRename={onCommitRename}
              onCancelEdit={onCancelEdit}
              onCommitCreate={onCommitCreate}
              onCancelCreate={onCancelCreate}
              parentPath={node.path}
            />
          ))}
          {showNewChild && (
            <NewItemRow
              depth={depth + 1}
              onConfirm={onCommitCreate}
              onCancel={onCancelCreate}
            />
          )}
        </>
      )}
    </>
  );
}

function ActionBtn({ children, title, onClick }: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: "none", border: "none", color: "#888",
        cursor: "pointer", padding: "0 3px", fontSize: 12,
        lineHeight: 1, borderRadius: 3,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#888"; }}
    >
      {children}
    </button>
  );
}

// ── FileTree root ──────────────────────────────────────────────────────────────

export default function FileTree({ files, active, onSelect, onNewFile, onRename, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const tree = buildTree(files);

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function openMenu(path: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ path, x: rect.right + 4, y: rect.top });
  }

  function startCreating(parentPath: string | null) {
    if (parentPath !== null) {
      setCollapsed((prev) => { const n = new Set(prev); n.delete(parentPath); return n; });
    }
    setEditing(null);
    setCreating({ parentPath });
    setMenu(null);
  }

  function commitCreate(name: string) {
    if (!creating) return;
    onNewFile(creating.parentPath, name);
    setCreating(null);
  }

  function cancelCreate() {
    setCreating(null);
  }

  function startEditing(path: string, currentName: string) {
    setCreating(null);
    setEditing({ path, currentName });
    setMenu(null);
  }

  function commitRename(oldPath: string, newName: string) {
    onRename(oldPath, newName);
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  function findNode(path: string, nodes: TreeNode[]): TreeNode | null {
    for (const n of nodes) {
      if (n.path === path) return n;
      if (n.kind === "folder") {
        const found = findNode(path, n.children);
        if (found) return found;
      }
    }
    return null;
  }

  function buildMenuItems(path: string): MenuItemDef[] {
    const node = findNode(path, tree);
    if (!node) return [];
    const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null;

    if (node.kind === "folder") {
      return [
        { label: "Nuevo documento dentro", action: () => startCreating(node.path) },
        { label: "Nuevo documento al mismo nivel", action: () => startCreating(parentPath) },
        { label: "Renombrar carpeta", action: () => startEditing(node.path, node.name) },
        { label: "Eliminar carpeta", danger: true, action: () => onDelete(node.path, "folder") },
      ];
    }
    return [
      { label: "Nuevo documento al mismo nivel", action: () => startCreating(parentPath) },
      { label: "Renombrar", action: () => startEditing(node.path, node.name) },
      { label: "Eliminar", danger: true, action: () => onDelete(node.path, "file") },
    ];
  }

  return (
    <div
      style={{
        width: 240, borderRight: "1px solid #2d2d2d",
        paddingTop: 12, paddingBottom: 12,
        overflowY: "auto", background: "#1e1e1e", color: "#ccc", flexShrink: 0,
      }}
      // Close menu when clicking the sidebar background
      onClick={() => setMenu(null)}
    >
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8, paddingLeft: 12, paddingRight: 8,
      }}>
        <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666" }}>
          Docs
        </strong>
        <ActionBtn title="Nuevo documento en raíz" onClick={() => startCreating(null)}>+</ActionBtn>
      </div>

      {/* Empty state */}
      {tree.length === 0 && !creating && (
        <div style={{ color: "#555", fontSize: 12, paddingLeft: 12 }}>Sin archivos. Crea uno.</div>
      )}

      {/* Tree */}
      <div style={{ paddingLeft: 4, paddingRight: 4 }}>
        {tree.map((node) => (
          <TreeNodeRow
            key={node.path}
            node={node}
            depth={0}
            active={active}
            collapsed={collapsed}
            hovered={hovered}
            editing={editing}
            creating={creating}
            onToggleCollapse={toggleCollapse}
            onSetHovered={setHovered}
            onSelect={onSelect}
            onOpenMenu={openMenu}
            onPlusClick={startCreating}
            onCommitRename={commitRename}
            onCancelEdit={cancelEdit}
            onCommitCreate={commitCreate}
            onCancelCreate={cancelCreate}
            parentPath={null}
          />
        ))}

        {/* New item at root level */}
        {creating?.parentPath === null && (
          <NewItemRow depth={0} onConfirm={commitCreate} onCancel={cancelCreate} />
        )}
      </div>

      {/* Context menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(menu.path)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
