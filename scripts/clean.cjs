const fs = require("node:fs");
const path = require("node:path");

removeDirectory("dist");
removeDirectory(".next");

function removeDirectory(target) {
  if (!fs.existsSync(target)) {
    return;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      removeDirectory(entryPath);
      continue;
    }

    fs.unlinkSync(entryPath);
  }

  fs.rmdirSync(target);
}
