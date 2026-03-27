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

  resolveIndexFiles(roots);
  sortNodes(roots);
  return roots;
}

/**
 * For each folder that contains a file named `folderName.md`,
 * promote that file as the folder's "content" (contentPath) and hide it from children.
 * This makes clicking the folder open its own document.
 */
function resolveIndexFiles(nodes: TreeNode[]): void {
  for (const node of nodes) {
    if (node.kind === "folder") {
      const indexName = node.name + ".md";
      const indexIdx = node.children.findIndex(
        (c) => c.kind === "file" && c.name === indexName
      );
      if (indexIdx !== -1) {
        const indexNode = node.children[indexIdx] as Extract<TreeNode, { kind: "file" }>;
        node.contentPath = indexNode.path;
        node.children.splice(indexIdx, 1);
      }
      resolveIndexFiles(node.children);
    }
  }
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
