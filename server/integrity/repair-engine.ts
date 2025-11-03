import fs from 'fs';
import path from 'path';

export interface RepairResult {
  repaired: string[];
  failed: string[];
  skipped: string[];
}

/**
 * Phase Ω.5 - Repair Engine
 * Repairs fake modules by replacing them with real templates
 */
export async function repairFakeModules(modules: string[]): Promise<RepairResult> {
  const repaired: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  
  const baseTemplatesDir = path.resolve('./server/integrity/templates');
  
  console.log(`🔧 [Repair Engine] Starting repair for ${modules.length} fake modules...`);
  
  // Create templates directory if it doesn't exist
  if (!fs.existsSync(baseTemplatesDir)) {
    console.log(`📁 [Repair Engine] Creating templates directory: ${baseTemplatesDir}`);
    fs.mkdirSync(baseTemplatesDir, { recursive: true });
  }

  for (const file of modules) {
    const fullPath = path.resolve(file);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ [Repair Engine] File not found: ${file}`);
      skipped.push(file);
      continue;
    }

    const fileName = path.basename(fullPath);
    const template = path.join(baseTemplatesDir, fileName);

    if (fs.existsSync(template)) {
      try {
        // Backup original file
        const backupPath = `${fullPath}.backup`;
        fs.copyFileSync(fullPath, backupPath);
        console.log(`💾 [Repair Engine] Backed up: ${file}`);

        // Replace with real template
        fs.copyFileSync(template, fullPath);
        repaired.push(file);
        console.log(`🔧 [Repair Engine] ✅ Replaced fake module with real template: ${file}`);
      } catch (error: any) {
        console.error(`❌ [Repair Engine] Failed to repair ${file}: ${error.message}`);
        failed.push(file);
      }
    } else {
      console.warn(`⚠️ [Repair Engine] No real template found for: ${fileName}`);
      skipped.push(file);
    }
  }

  console.log(`🔧 [Repair Engine] Repair complete:`);
  console.log(`   ✅ Repaired: ${repaired.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   ⏭️ Skipped: ${skipped.length}`);

  return { repaired, failed, skipped };
}
