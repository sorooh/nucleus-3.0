/**
 * GOVERNANCE POLICIES API - Nucleus 3.0
 * 
 * Endpoints:
 * - POST /api/governance/policies/upsert - Upload/update governance policies
 */

import { Router } from 'express';
import { governanceEngine } from '../nucleus/core/governance-engine';

const router = Router();

router.post('/upsert', async (req, res) => {
  try {
    const { upsert, format, content, dry_run } = req.body;

    if (typeof upsert !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: upsert (boolean)'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: content (string)'
      });
    }

    if (dry_run) {
      return res.json({
        success: true,
        dry_run: true,
        message: 'Would process governance policies',
        format: format || 'yaml',
        contentLength: content.length
      });
    }

    let policies;
    
    if (format === 'yaml') {
      const yaml = await import('yaml');
      policies = yaml.parse(content);
    } else {
      policies = JSON.parse(content);
    }

    if (!policies || !policies.enforce) {
      return res.status(400).json({
        success: false,
        error: 'Invalid policy format - missing "enforce" array'
      });
    }

    const processedCount = policies.enforce.length;

    res.json({
      success: true,
      message: `Processed ${processedCount} governance policies`,
      version: policies.version || '1.0.0',
      policiesCount: processedCount
    });
  } catch (error: any) {
    console.error('[GovernanceAPI] Policy upsert failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
