import fs from 'fs/promises';
import path from 'path';

export async function runHonestyAudit() {
  const fakeModules: string[] = [];
  const projectRoot = path.resolve('./server');

  async function scan(file: string) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const isFake =
        content.includes('SIMULATION') ||
        content.includes('setTimeout') && content.includes('resolve') && content.includes('deployed') ||
        content.includes('mock_results') ||
        content.includes('fabricated') ||
        content.includes('// TODO: Real implementation');

      if (isFake) fakeModules.push(file);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      const promises = entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(full);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.py')) {
          await scan(full);
        }
      });
      
      await Promise.all(promises);
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }

  await walk(projectRoot);

  console.log(`🕵️‍♂️ [Honesty Auditor] Found ${fakeModules.length} fake modules`);
  return { fakeModules };
}
