import { Router } from "express";
import { Nicholas } from "../boot/nicholas-core";

const router = Router();

router.post("/api/nicholas/audit/run", async (req, res) => {
  try {
    const report = await Nicholas.runFullAudit(req.body || {});
    res.json({ success: true, report });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.get("/api/nicholas/health", (_req, res) => {
  res.json({ 
    success: true, 
    nicholasReady: Nicholas.isReady(),
    timestamp: new Date()
  });
});

export default router;
