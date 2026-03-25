import type { TreeNode } from "./types";

export function buildTree(files: string[]): TreeNode[] {
  const roots: TreeNode[] = [];

  for (const filepath of files) {
    const parts = filepath.split("/");
    let current = roots;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        current.push({ kind: "file", name: part, path: filepath });
      } else {
        let folder = current.find(
          (n): n is Extract<TreeNode, { kind: "folder" }> =>
            n.kind === "folder" && n.name === part
        );
        if (!folder) {
          folder = { kind: "folder", name: part, path: fullPath, children: [] };
          current.push(folder);
        }
        current = folder.children;
      }
    }
  }

  sortNodes(roots);
  return roots;
}

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.kind === "folder") sortNodes(node.children);
  }
}
