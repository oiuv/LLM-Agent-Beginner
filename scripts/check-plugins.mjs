import assert from "node:assert/strict";
import { readFileSync, readdirSync, realpathSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = realpathSync(path.join(root, "examples", "learning-coach-plugin"));
const schemaRoot = path.join(root, "schemas", "agent-plugins", "1.0.0");
const ajv = new Ajv2020({ allErrors: true });
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

// An author check, not a runtime loader: every schema violation fails this command.
// Real clients apply the specification's narrower, sometimes non-fatal boundaries.
function validateJson(filename, schemaName) {
  const schema = json(path.join(schemaRoot, schemaName));
  const validate = ajv.compile(schema);
  const data = json(path.join(pluginRoot, filename));
  assert.ok(validate(data), filename + ": " + ajv.errorsText(validate.errors));
  return data;
}

function resolveInside(file) {
  const actual = realpathSync(file);
  const relative = path.relative(pluginRoot, actual);
  assert.ok(relative !== ".." && !relative.startsWith(".." + path.sep) &&
    !path.isAbsolute(relative), "Package path escapes plugin root: " + file);
  return actual;
}

const visited = new Set();
function checkFiles(file) {
  const actual = resolveInside(file);
  if (visited.has(actual)) return;
  visited.add(actual);
  if (statSync(actual).isDirectory()) {
    for (const entry of readdirSync(actual)) checkFiles(path.join(actual, entry));
  } else {
    assert.ok(statSync(actual).isFile(), "Expected a regular package file: " + file);
  }
}

function checkSkill(directory) {
  const filename = path.join(directory, "SKILL.md");
  assert.ok(statSync(resolveInside(filename)).isFile(), "SKILL.md must be a regular file");
  const text = readFileSync(filename, "utf8");
  const parts = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  assert.ok(parts, filename + ": YAML frontmatter and instructions are required");
  const document = parseDocument(parts[1], { uniqueKeys: true });
  assert.equal(document.errors.length, 0, filename + ": invalid YAML " + document.errors.join("; "));
  const data = document.toJS({ maxAliasCount: 100 });
  assert.ok(data && typeof data === "object" && !Array.isArray(data), "Skill metadata must be a mapping");
  const allowed = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
  for (const key of Object.keys(data)) assert.ok(allowed.has(key), "Nonstandard Skill field: " + key);
  assert.equal(data.name, path.basename(directory), "Skill name must match its directory");
  assert.match(data.name, /^(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(data.name.length <= 64, "Skill name is too long");
  assert.equal(typeof data.description, "string", "Skill description must be a string");
  assert.ok(data.description.trim().length > 0 && [...data.description].length <= 1024);
  for (const key of ["license", "compatibility", "allowed-tools"]) {
    if (key in data) assert.equal(typeof data[key], "string", key + " must be a string");
  }
  if ("compatibility" in data) assert.ok([...data.compatibility].length <= 500);
  if ("metadata" in data) {
    assert.ok(data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata));
    assert.ok(Object.values(data.metadata).every((value) => typeof value === "string"));
  }
  assert.ok(parts[2].trim(), "Skill instructions must not be empty");
}

checkFiles(pluginRoot);
const manifest = validateJson("plugin.json", "plugin.schema.json");
let servers = 0;
if (existsSync(path.join(pluginRoot, "mcp.json"))) {
  const mcp = validateJson("mcp.json", "mcp.schema.json");
  assert.equal(mcp.$schema.replace("mcp.schema.json", ""), manifest.$schema.replace("plugin.schema.json", ""),
    "Plugin and MCP specification versions must match");
  servers = Object.keys(mcp.mcpServers).length;
}
const skillsRoot = path.join(pluginRoot, "skills");
let skills = 0;
if (existsSync(skillsRoot)) {
  assert.ok(statSync(skillsRoot).isDirectory(), "skills must be a directory");
  for (const name of readdirSync(skillsRoot)) {
    const directory = path.join(skillsRoot, name);
    if (statSync(directory).isDirectory() && existsSync(path.join(directory, "SKILL.md"))) {
      checkSkill(directory);
      skills += 1;
    }
  }
}
console.log("Checked " + manifest.name + ": official JSON schemas, " + skills +
  " Skills, " + servers + " MCP configuration(s), and package file containment.");
console.log("Static author checks only; no client loading, MCP connection or model evaluation.");
