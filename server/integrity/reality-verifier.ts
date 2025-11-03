import fs from 'fs/promises';

export async function verifyReality(honestyResult: any) {
  const failed: string[] = [];

  for (const file of honestyResult.fakeModules) {
    // Check if file is in critical systems
    const isCritical = 
      file.includes('auto-builder') || 
      file.includes('deploy') ||
      file.includes('sandbox') ||
      file.includes('dispatcher');

    if (isCritical) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // For auto-builder, check if it actually creates files
        if (file.includes('auto-builder')) {
          const hasRealFileOps = 
            content.includes('fs.writeFileSync') || 
            content.includes('await writeFile') ||
            content.includes('CodeExecutor');
          
          if (!hasRealFileOps) {
            failed.push(file);
          }
        }
        
        // For dispatcher, check if it has mock_results
        if (file.includes('dispatcher')) {
          if (content.includes('mock_results') || content.includes('mock_result')) {
            failed.push(file);
          }
        }
        
        // For sandbox, check if it actually runs tests
        if (file.includes('sandbox')) {
          if (content.includes('SIMULATION') && content.includes('not executing real tests')) {
            failed.push(file);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  console.log(`🧪 [Reality Verifier] ${failed.length} modules failed reality check`);
  return { failed };
}
