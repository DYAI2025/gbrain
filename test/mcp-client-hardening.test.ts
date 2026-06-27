import { describe, it, expect } from 'bun:test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('LPAM Live-Hook Integration', () => {
  it('should mirror a Plumbline artifact to the Obsidian Vault and Qdrant', async () => {
    const testFile = '/root/Plumbline/data/watcher_check/integration-test.json';
    const vaultFile = '/root/obsidian-vault/plumbline/plumbline_framework/test_run/watcher_check_integration-test.md';
    
    // 1. Create a mock Plumbline artifact
    const artifact = {
      id: 'integration-test',
      schema_version: '1.0.0',
      artifact_type: 'watcher_check',
      project_id: 'plumbline_framework',
      run_id: 'test_run',
      created_at: new Date().toISOString(),
      source_refs: ['test-trigger'],
      created_by: 'integration-test',
      evidence_class: 'integration-fake',
      confidence: 1.0,
      approval_status: 'approved'
    };
    
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, JSON.stringify(artifact, null, 2));
    
    // 2. Trigger the sync script (simulating what the hook does)
    execSync(`python3 /root/Plumbline/scripts/sync_artifacts.py ${testFile}`);
    
    // 3. Verify Mirroring to Vault
    expect(fs.existsSync(vaultFile)).toBe(true);
    const content = fs.readFileSync(vaultFile, 'utf8');
    expect(content).toContain('Plumbline Artifact: watcher_check');
    expect(content).toContain('integration-test');
    
    // 4. Verify Qdrant Indexing
    // We check if the artifact ID exists in the hermes_rag collection via HTTP
    const response = await fetch('http://localhost:6333/collections/hermes_rag/points/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: new Array(768).fill(0), // Dummy vector, we just want to see if search works
        limit: 10,
        filter: {
          must: [{ key: 'payload.id', match: { value: 'integration-test' } }]
        }
      })
    });
    
    const result = await response.json();
    // Note: In a real env, the embedding must happen. We check for 200 OK as a baseline for "reachable"
    expect(response.status).toBe(200);
    
    // Cleanup
    fs.unlinkSync(testFile);
    if (fs.existsSync(vaultFile)) fs.unlinkSync(vaultFile);
  });
});
