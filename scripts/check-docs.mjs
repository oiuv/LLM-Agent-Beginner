import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([".git", "node_modules", "dist", ".venv", "__pycache__", ".uv-cache"]);
const markdown = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) markdown.push(full);
  }
}
walk(root);
const errors = [];
const documents = new Map();
for (const file of markdown) {
  const visible = [];
  const headings = new Set();
  const duplicates = new Map();
  let fence;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const marker = line.match(/^\s{0,3}(\x60{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.char &&
          marker[1].length >= fence.length && marker[2].trim() === "") fence = undefined;
      return;
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length, line: i + 1 };
      return;
    }
    visible.push({ line, number: i + 1 });
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const slug = heading[1].toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/\s/g, "-");
      const count = duplicates.get(slug) ?? 0;
      duplicates.set(slug, count + 1);
      headings.add(count ? slug + "-" + count : slug);
    }
  });
  if (fence) errors.push(path.relative(root, file) + ":" + fence.line + ": unclosed code fence");
  documents.set(file, { visible, headings });
}
let checked = 0;
for (const [file, doc] of documents) {
  for (const { line, number } of doc.visible) {
    const links = line.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/g);
    for (const match of links) {
      const url = match[1].replace(/^<|>$/g, "");
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//")) continue;
      checked += 1;
      const [pathname, anchor] = url.split("#");
      let target, decodedAnchor;
      try {
        target = pathname ? path.resolve(path.dirname(file), decodeURIComponent(pathname)) : file;
        decodedAnchor = anchor ? decodeURIComponent(anchor) : undefined;
      } catch {
        errors.push(path.relative(root, file) + ":" + number + ": invalid URL " + url);
        continue;
      }
      if (!existsSync(target)) {
        errors.push(path.relative(root, file) + ":" + number + ": missing " + url);
      } else if (decodedAnchor && statSync(target).isFile() && documents.has(target) &&
                 !documents.get(target).headings.has(decodedAnchor)) {
        errors.push(path.relative(root, file) + ":" + number + ": missing heading " + url);
      }
    }
  }
}
for (const entry of readdirSync(root)) {
  if (/^PART[1-7]-/.test(entry)) errors.push("Duplicate course directory: " + entry);
}
const index = readFileSync(path.join(root, "tutorial", "README.md"), "utf8");
for (const entry of readdirSync(path.join(root, "tutorial"), { withFileTypes: true })) {
  if (entry.isDirectory() && /^\d{2}-/.test(entry.name) &&
      !index.includes("(" + entry.name + "/README.md)")) {
    errors.push("Chapter missing from course index: " + entry.name);
  }
}
const rootPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
for (const [name, command] of Object.entries(rootPackage.scripts)) {
  const target = command.match(/npm --prefix ([\\w/-]+) run ([\\w:.-]+)/);
  if (!target) continue;
  const packageFile = path.join(root, target[1], "package.json");
  if (!existsSync(packageFile)) {
    errors.push("Missing package for root command: " + name);
  } else {
    const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
    if (!pkg.scripts?.[target[2]]) errors.push("Missing target script for root command: " + name);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Checked " + markdown.length + " Markdown files, " + checked +
    " local links, code fences and the single course index.");
}
