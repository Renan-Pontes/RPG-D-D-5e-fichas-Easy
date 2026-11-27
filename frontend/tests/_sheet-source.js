import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const FE_DIR = resolve(TESTS_DIR, '..');

const SHEET_FILES = [
  'components/Sheet.jsx',
  'src/sheet/sheet-shared.jsx',
  'src/sheet/hero/SheetHero.jsx',
  'src/sheet/belt/BeltHex.jsx',
  'src/sheet/belt/BeltQuickSlot.jsx',
  'src/sheet/belt/BeltHive.jsx',
  'src/sheet/tabs/SheetCompanionsAndNotes.jsx',
  'src/sheet/tabs/SheetPlay.jsx',
  'src/sheet/tabs/SheetSkillsSection.jsx',
  'src/sheet/tabs/TimelineModals.jsx',
  'src/sheet/tabs/SheetFeaturesSection.jsx',
];

const SHEET_TABS_FILES = [
  'components/SheetTabs.jsx',
  'src/sheet/spells/RestButtons.jsx',
  'src/sheet/spells/SlotMatrix.jsx',
  'src/sheet/spells/SpellRow.jsx',
  'src/sheet/spells/SpellViews.jsx',
  'src/sheet/spells/UnifiedSpellsHUD.jsx',
  'src/sheet/inventory/InventoryList.jsx',
  'src/sheet/inventory/SheetInventoryTab.jsx',
  'src/sheet/story/SheetStoryTab.jsx',
];

function expandCssImports(absPath) {
  const raw = readFileSync(absPath, 'utf8');
  return raw.replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (_, sub) => expandCssImports(resolve(dirname(absPath), sub)));
}

export function readModular(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (norm.endsWith('components/Sheet.jsx')) {
    return SHEET_FILES.map(f => readFileSync(resolve(FE_DIR, f), 'utf8')).join('\n');
  }
  if (norm.endsWith('components/SheetTabs.jsx')) {
    return SHEET_TABS_FILES.map(f => readFileSync(resolve(FE_DIR, f), 'utf8')).join('\n');
  }
  const abs = resolve(TESTS_DIR, relPath);
  if (norm.endsWith('.css')) return expandCssImports(abs);
  return readFileSync(abs, 'utf8');
}
