import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Test route - requires valid session
router.get("/test", requireAuth, (req, res) => {
  res.json({ 
    message: "Access granted!",
    user: req.user 
  });
});

export default router;