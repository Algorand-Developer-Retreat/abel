import { abel } from "../src/lib/config.js";
import { readFileSync, writeFileSync } from "fs";

const template = readFileSync("scripts/template-getter.ts").toString();

for(const key of Object.keys(abel)) {
  if (typeof abel[key] === "function" && key.startsWith('getAssets')) {
    const viewName = key.replace('getAssets', '');
    const destFile = `src/get-${viewName.toLowerCase()}.ts`;
    const contents = template.replace(/Micro/g, viewName);
    writeFileSync(destFile, contents);
    console.log("Generated", destFile);
  }
}
