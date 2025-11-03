import { Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

const router = Router();

// Get the active constitution
router.get('/current', async (req, res) => {
  try {
    const constitution = await db.execute(sql`
      SELECT * FROM bot_constitution 
      ORDER BY effective_date DESC 
      LIMIT 1
    `);
    
    if (constitution.rows.length === 0) {
      return res.status(404).json({ error: 'No constitution found' });
    }
    
    res.json({ constitution: constitution.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching constitution:', error);
    res.status(500).json({ error: 'Failed to fetch constitution' });
  }
});

// Get all bot commitments
router.get('/commitments', async (req, res) => {
  try {
    const commitments = await db.execute(sql`
      SELECT 
        bc.*,
        a.name as bot_name,
        a.agent_type,
        a.status as bot_status
      FROM bot_commitments bc
      LEFT JOIN agents a ON bc.bot_id = a.uuid
      WHERE bc.status = 'active'
      ORDER BY bc.acknowledged_at DESC
    `);
    
    res.json({ commitments: commitments.rows });
  } catch (error) {
    console.error('❌ Error fetching commitments:', error);
    res.status(500).json({ error: 'Failed to fetch commitments' });
  }
});

// Record a violation
router.post('/violation', async (req, res) => {
  try {
    const { bot_id, violation_type, description, severity } = req.body;
    
    if (!bot_id || !violation_type) {
      return res.status(400).json({ error: 'bot_id and violation_type are required' });
    }
    
    // Increment violation count
    await db.execute(sql`
      UPDATE bot_commitments 
      SET 
        violation_count = violation_count + 1,
        last_check = NOW(),
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{last_violation}',
          to_jsonb(NOW()::text)
        )
      WHERE bot_id = ${bot_id}
    `);
    
    // Log the violation in audit logs
    await db.execute(sql`
      INSERT INTO audit_logs (
        user_id, 
        action, 
        entity_type, 
        entity_id, 
        details
      ) VALUES (
        'system',
        'constitution_violation',
        'bot',
        ${bot_id},
        ${JSON.stringify({
          violation_type,
          description,
          severity,
          timestamp: new Date().toISOString()
        })}
      )
    `);
    
    // Check if bot should be suspended (3+ violations)
    const commitment = await db.execute(sql`
      SELECT violation_count FROM bot_commitments WHERE bot_id = ${bot_id}
    `);
    
    const violationCount = Number(commitment.rows[0]?.violation_count) || 0;
    
    if (violationCount >= 3) {
      // Suspend bot
      await db.execute(sql`
        UPDATE agents SET status = 'suspended' WHERE uuid = ${bot_id}
      `);
      
      await db.execute(sql`
        UPDATE bot_commitments SET status = 'suspended' WHERE bot_id = ${bot_id}
      `);
      
      return res.json({ 
        success: true, 
        action: 'suspended',
        message: 'Bot suspended due to repeated violations',
        violation_count: violationCount
      });
    }
    
    res.json({ 
      success: true,
      action: 'violation_recorded',
      violation_count: Number(violationCount) + 1
    });
  } catch (error) {
    console.error('❌ Error recording violation:', error);
    res.status(500).json({ error: 'Failed to record violation' });
  }
});

// Verify bot compliance
router.post('/verify/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    
    const commitment = await db.execute(sql`
      SELECT * FROM bot_commitments WHERE bot_id = ${botId} AND status = 'active'
    `);
    
    if (commitment.rows.length === 0) {
      return res.status(404).json({ 
        compliant: false,
        error: 'Bot not enrolled in constitution' 
      });
    }
    
    const violationCount = Number(commitment.rows[0].violation_count) || 0;
    
    // Update last check
    await db.execute(sql`
      UPDATE bot_commitments SET last_check = NOW() WHERE bot_id = ${botId}
    `);
    
    res.json({
      compliant: Number(violationCount) < 3,
      violation_count: violationCount,
      status: commitment.rows[0].status,
      last_check: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verifying compliance:', error);
    res.status(500).json({ error: 'Failed to verify compliance' });
  }
});

// Get constitution statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_bots,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_bots,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_bots,
        SUM(violation_count) as total_violations,
        AVG(violation_count) as avg_violations
      FROM bot_commitments
    `);
    
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
