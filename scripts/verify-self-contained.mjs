// Self-containment check for dsh-session-hotkeys.
// Verifies:
//   1. package.json carries the dsh bundle patch and the dsh.client declaration
//   2. lib/client.js parses, registers via __ModuleLoader__, and its factory
//      returns { apply, inject } with only "react" requested from the loader
//   3. the host half and the composition patch row exist
// Run: node scripts/verify-self-contained.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const clientSrc = readFileSync(join(root, "lib/client.js"), "utf8");
const indexSrc = readFileSync(join(root, "lib/index.js"), "utf8");
const patchSrc = readFileSync(join(root, "cordis.patch.yml"), "utf8");

// 1. package.json declarations
if (!(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === "./cordis.patch.yml")) {
  failures.push("package.json: missing dsh.bundle.patch -> ./cordis.patch.yml");
}
if (!(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === "web")) {
  failures.push('package.json: missing dsh.client with platform "web"');
}
if (!(pkg.exports && pkg.exports["./client"])) {
  failures.push('package.json: missing exports["./client"]');
}

// 2. execute the module wrapper with a stubbed loader
const requiredSpecs = [];
let captured = null;
try {
  new Function("window", clientSrc)({
    __ModuleLoader__: {
      load: (def) => { captured = def; }
    }
  });
} catch (err) {
  failures.push(`lib/client.js: failed to register with __ModuleLoader__: ${err.message}`);
}
if (captured !== null && captured !== undefined) {
  if (captured.id !== "dsh-session-hotkeys") failures.push(`lib/client.js: unexpected module id "${captured.id}"`);
  const stubReact = {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => ({}),
    Fragment: "fragment"
  };
  const fakeRequire = (spec) => {
    requiredSpecs.push(spec);
    if (spec === "react") return stubReact;
    throw new Error("unexpected require of \"" + spec + "\"");
  };
  try {
    const mod = captured.factory(fakeRequire);
    if (mod === null || typeof mod !== "object") failures.push("lib/client.js: factory did not return a module object");
    else {
      if (typeof mod.apply !== "function") failures.push("lib/client.js: exports.apply is not a function");
      if (!Array.isArray(mod.inject) || !mod.inject.includes("slots")) failures.push("lib/client.js: exports.inject must include \"slots\"");
    }
  } catch (err) {
    failures.push(`lib/client.js: factory threw: ${err.message}`);
  }
  for (const spec of requiredSpecs) {
    if (spec !== "react") failures.push(`lib/client.js: factory required external module "${spec}" (only "react" is allowed)`);
  }
} else {
  failures.push("lib/client.js: __ModuleLoader__.load was never called");
}

// 3. host half + patch row
if (!indexSrc.includes("function apply() {}")) failures.push("lib/index.js: missing no-op host apply");
if (!patchSrc.includes("dsh-session-hotkeys")) failures.push("cordis.patch.yml: missing insert row for dsh-session-hotkeys");

if (failures.length > 0) {
  console.error("verify-self-contained FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("verify-self-contained OK: declarations, registrable self-contained client bundle, exports and patch row all present.");
