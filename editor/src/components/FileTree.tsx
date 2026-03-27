import { useState, useRef, useMemo, useCallback, memo } from "react";
import type { TreeNode } from "../types";
import { buildTree } from "../treeUtils";

interface Props {
  files: string[];
  active: string | null;
  onSelect: (path: string) => void;
  onNewFile: (parentPath: string | null, name: string) => void;
  onNewProject?: (parentPath: string | null, name: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string, kind: "file" | "folder") => void;
  onMove: (fromPath: string, toFolderPath: string | null) => void;
  projectFolders?: Set<string>;
}

interface CreatingState {
  parentPath: string | null;
  kind?: "document" | "project";
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

// ── Inline new-document input ──────────────────────────────────────────────────

function NewItemRow({ depth, isProject, onConfirm, onCancel }: {
  depth: number;
  isProject?: boolean;
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
      <span style={{ marginRight: 5, fontSize: 13, flexShrink: 0 }}>{isProject ? "📋" : "📄"}</span>
      <input
        autoFocus
        value={value}
        placeholder={isProject ? "nombre-proyecto" : "nombre-documento"}
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
    <div style={{
      position: "fixed", top: y, left: x, zIndex: 200,
      background: "#2d2d2d", border: "1px solid #444", borderRadius: 6,
      padding: "4px 0", minWidth: 200,
      boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    }}>
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
  dragging: string | null;
  dragOver: string | null;
  onToggleCollapse: (path: string) => void;
  onSetHovered: (path: string | null) => void;
  onSelect: (path: string) => void;
  onOpenMenu: (path: string, e: React.MouseEvent) => void;
  onPlusClick: (parentPath: string | null) => void;
  onCommitRename: (oldPath: string, newName: string) => void;
  onCancelEdit: () => void;
  onCommitCreate: (name: string) => void;
  onCancelCreate: () => void;
  onDragStart: (path: string) => void;
  onDragOver: (path: string) => void;
  onDrop: (fromPath: string, targetPath: string, targetKind: "file" | "folder") => void;
  onDragEnd: () => void;
  parentPath: string | null;
  projectFolders?: Set<string>;
}

const TreeNodeRow = memo(function TreeNodeRow({
  node, depth, active, collapsed, hovered, editing, creating, dragging, dragOver,
  onToggleCollapse, onSetHovered, onSelect, onOpenMenu, onPlusClick,
  onCommitRename, onCancelEdit, onCommitCreate, onCancelCreate,
  onDragStart, onDragOver, onDrop, onDragEnd, parentPath, projectFolders,
}: RowProps) {
  const isFolder = node.kind === "folder";
  const contentPath = isFolder ? node.contentPath : undefined;
  const isCollapsed = isFolder && collapsed.has(node.path);
  const selectPath = isFolder ? contentPath : node.path;
  const isActive = selectPath != null && active === selectPath;
  const isHovered = hovered === node.path;
  const isEditing = editing?.path === node.path;
  const showNewChild = isFolder && !isCollapsed && creating?.parentPath === node.path;
  const isDragging = dragging === node.path;
  const isDragOver = dragOver === node.path && dragging !== node.path;

  function handleArrowClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isFolder) onToggleCollapse(node.path);
  }

  function handleNameClick(e: React.MouseEvent) {
    if (isEditing) return;
    e.stopPropagation();
    if (isFolder) {
      if (isCollapsed) onToggleCollapse(node.path);
      if (contentPath) onSelect(contentPath);
    } else {
      onSelect(node.path);
    }
  }

  return (
    <>
      <div
        draggable
        onMouseEnter={() => onSetHovered(node.path)}
        onMouseLeave={() => onSetHovered(null)}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.path);
          onDragStart(node.path);
        }}
        onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          onDragOver(node.path);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const fromPath = e.dataTransfer.getData("text/plain");
          onDrop(fromPath, node.path, isFolder ? "folder" : "file");
        }}
        style={{
          display: "flex", alignItems: "center",
          paddingLeft: depth * 16 + 6, paddingRight: 4,
          paddingTop: 4, paddingBottom: 4,
          borderRadius: 4,
          opacity: isDragging ? 0.35 : 1,
          background: isDragOver
            ? "#1a3a5c"
            : isActive ? "#2d4a7a"
            : isHovered ? "#2a2a2a"
            : "transparent",
          outline: isDragOver ? "1px dashed #4ec9b0" : "none",
          color: isActive ? "#fff" : "#bbb",
          fontSize: 13, userSelect: "none",
          cursor: "grab",
        }}
      >
        {/* Arrow — toggles collapse */}
        <span
          onClick={handleArrowClick}
          style={{
            width: 14, flexShrink: 0, color: "#666", fontSize: 10, marginRight: 2,
            cursor: isFolder ? "pointer" : "default",
          }}
        >
          {isFolder ? (isCollapsed ? "▶" : "▼") : ""}
        </span>

        {/* Icon + Name — selects document */}
        <span
          onClick={handleNameClick}
          style={{
            display: "flex", alignItems: "center", flex: 1,
            minWidth: 0, cursor: "pointer",
          }}
        >
          <span style={{ marginRight: 5, fontSize: 13, flexShrink: 0 }}>
            {isFolder
              ? (projectFolders?.has(node.path) ? "📋" : contentPath ? "📝" : "📁")
              : "📄"}
          </span>

          {isEditing ? (
            <InlineEdit
              currentName={node.name}
              onConfirm={(newName) => onCommitRename(node.path, newName)}
              onCancel={onCancelEdit}
            />
          ) : (
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.name}
            </span>
          )}
        </span>

        {/* Hover actions */}
        {isHovered && !isEditing && (
          <span style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: 4 }}>
            <ActionBtn
              title="Nuevo documento"
              onClick={(e) => { e.stopPropagation(); onPlusClick(isFolder ? node.path : parentPath); }}
            >+</ActionBtn>
            <ActionBtn
              title="Más opciones"
              onClick={(e) => { e.stopPropagation(); onOpenMenu(node.path, e); }}
            >···</ActionBtn>
          </span>
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
              dragging={dragging}
              dragOver={dragOver}
              onToggleCollapse={onToggleCollapse}
              onSetHovered={onSetHovered}
              onSelect={onSelect}
              onOpenMenu={onOpenMenu}
              onPlusClick={onPlusClick}
              onCommitRename={onCommitRename}
              onCancelEdit={onCancelEdit}
              onCommitCreate={onCommitCreate}
              onCancelCreate={onCancelCreate}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              parentPath={node.path}
              projectFolders={projectFolders}
            />
          ))}
          {showNewChild && (
            <NewItemRow
              depth={depth + 1}
              isProject={creating?.kind === "project"}
              onConfirm={onCommitCreate}
              onCancel={onCancelCreate}
            />
          )}
        </>
      )}
    </>
  );
});

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

export default function FileTree({ files, active, onSelect, onNewFile, onNewProject, onRename, onDelete, onMove, projectFolders }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const draggedPathRef = useRef<string | null>(null); // reliable source of truth for dragged path

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const openMenu = useCallback((path: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ path, x: rect.right + 4, y: rect.top });
  }, []);

  const startCreating = useCallback((parentPath: string | null, kind: "document" | "project" = "document") => {
    if (parentPath !== null) {
      setCollapsed((prev) => { const n = new Set(prev); n.delete(parentPath); return n; });
    }
    setEditing(null);
    setCreating({ parentPath, kind });
    setMenu(null);
  }, []);

  const commitCreate = useCallback((name: string) => {
    setCreating((c) => {
      if (!c) return null;
      if (c.kind === "project") onNewProject?.(c.parentPath, name);
      else onNewFile(c.parentPath, name);
      return null;
    });
  }, [onNewFile, onNewProject]);

  const cancelCreate = useCallback(() => setCreating(null), []);

  const startEditing = useCallback((path: string, currentName: string) => {
    setCreating(null);
    setEditing({ path, currentName });
    setMenu(null);
  }, []);

  const commitRename = useCallback((oldPath: string, newName: string) => {
    onRename(oldPath, newName);
    setEditing(null);
  }, [onRename]);

  const cancelEdit = useCallback(() => setEditing(null), []);

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

  const handleDragOver = useCallback((targetPath: string) => {
    if (draggedPathRef.current && draggedPathRef.current !== targetPath) {
      setDragOver(targetPath);
    }
  }, []);

  const handleDrop = useCallback((fromPathArg: string, targetPath: string, targetKind: "file" | "folder") => {
    const fromPath = draggedPathRef.current ?? fromPathArg;
    draggedPathRef.current = null;
    setDragging(null);
    setDragOver(null);
    if (!fromPath || fromPath === targetPath) return;
    const toFolder = targetKind === "folder" ? targetPath : targetPath.replace(/\.md$/, "");
    onMove(fromPath, toFolder);
  }, [onMove]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const handleDragStart = useCallback((path: string) => {
    draggedPathRef.current = path;
    setDragging(path);
  }, []);

  function buildMenuItems(path: string): MenuItemDef[] {
    const node = findNode(path, tree);
    if (!node) return [];
    const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null;

    if (node.kind === "folder") {
      return [
        { label: "Nuevo documento dentro", action: () => startCreating(node.path, "document") },
        { label: "Nuevo proyecto dentro", action: () => startCreating(node.path, "project") },
        { label: "Nuevo documento al mismo nivel", action: () => startCreating(parentPath, "document") },
        { label: "Renombrar", action: () => startEditing(node.path, node.name) },
        { label: "Eliminar", danger: true, action: () => onDelete(node.path, "folder") },
      ];
    }
    return [
      { label: "Nuevo documento al mismo nivel", action: () => startCreating(parentPath, "document") },
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
      onClick={() => setMenu(null)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(null);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        // Drop on empty sidebar area = move to root
        e.preventDefault();
        const from = draggedPathRef.current ?? e.dataTransfer.getData("text/plain");
        draggedPathRef.current = null;
        setDragging(null);
        setDragOver(null);
        if (from) onMove(from, null);
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8, paddingLeft: 12, paddingRight: 8,
      }}>
        <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666" }}>
          Docs
        </strong>
        <span style={{ display: "flex", gap: 2 }}>
          <ActionBtn title="Nuevo documento" onClick={() => startCreating(null, "document")}>+</ActionBtn>
          <ActionBtn title="Nuevo proyecto" onClick={() => startCreating(null, "project")}>📋</ActionBtn>
        </span>
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
            dragging={dragging}
            dragOver={dragOver}
            onToggleCollapse={toggleCollapse}
            onSetHovered={setHovered}
            onSelect={onSelect}
            onOpenMenu={openMenu}
            onPlusClick={startCreating}
            onCommitRename={commitRename}
            onCancelEdit={cancelEdit}
            onCommitCreate={commitCreate}
            onCancelCreate={cancelCreate}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            parentPath={null}
            projectFolders={projectFolders}
          />
        ))}

        {/* New item at root */}
        {creating?.parentPath === null && (
          <NewItemRow depth={0} isProject={creating.kind === "project"} onConfirm={commitCreate} onCancel={cancelCreate} />
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
