import fs from 'fs/promises';
import path from 'path';

export async function validateAutonomy(enforcementResult: any) {
  // Count total modules in server
  let totalModules = 0;
  
  async function countModules(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      const promises = entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await countModules(full);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.py')) {
          totalModules++;
        }
      });
      
      await Promise.all(promises);
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }
  
  await countModules(path.resolve('./server'));
  
  const isolated = enforcementResult.isolated.length;
  const score = Math.max(0, ((totalModules - isolated) / totalModules) * 100);

  console.log(`🧠 [Autonomy Validator] Autonomy Score: ${score.toFixed(1)}%`);
  console.log(`📊 [Autonomy Validator] Total: ${totalModules} modules, Fake: ${isolated} modules`);
  
  return { score, totalModules, fakeModules: isolated };
}
