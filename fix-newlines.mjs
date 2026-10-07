import fs from 'node:fs';
for (const p of [
  'C:\\Users\\cibesabz\\Black-Clover-Live\\src\\main\\main.js',
  'C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\ProjectService.js'
]) {
  let s=fs.readFileSync(p,'utf8');
  s=s.replace("import { LocalAssetLibrary } from './LocalAssetLibrary.js';\\nimport { BrainProviderStore } from './BrainProviderStore.js';\\nimport { setRuntimeProviderConfig,onlineBrainPoolFromEnv } from '../agent/OnlineBrainPool.js';",
    "import { LocalAssetLibrary } from './LocalAssetLibrary.js';\nimport { BrainProviderStore } from './BrainProviderStore.js';\nimport { setRuntimeProviderConfig,onlineBrainPoolFromEnv } from '../agent/OnlineBrainPool.js';");
  s=s.replace("return true;}\\n  async list(){return projects.list();}","return true;}\n  async list(){return projects.list();}");
  s=s.replace("ipcMain.handle('brain:catalog',()=>agent.modelCatalog());\\nipcMain.handle('brain:settings'","ipcMain.handle('brain:catalog',()=>agent.modelCatalog());\nipcMain.handle('brain:settings'");
  s=s.replaceAll(");\\nipcMain.handle('brain:",");\nipcMain.handle('brain:");
  fs.writeFileSync(p,s,'utf8');
}
console.log('literal newline markers fixed');