import fs from 'fs';
import path from 'path';
import toml from 'toml';

export function loadConfig() {
  const configPath = path.resolve('shopify.app.toml');
  const configFile = fs.readFileSync(configPath, 'utf-8');
  return toml.parse(configFile);
}
