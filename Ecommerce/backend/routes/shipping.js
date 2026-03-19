import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// ================================================================
// GET /api/shipping/calculate
// Query params: province (string), weight_kg (number)
// Returns: { fee: number, zone: string }
// ================================================================

router.get("/calculate", async (req, res) => {
  try {
    const { province, weight_kg } = req.query;

    if (!province || !weight_kg) {
      return res.status(400).json({
        success: false,
        error: "province and weight_kg are required"
      });
    }

    const weight = parseFloat(weight_kg);
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        error: "weight_kg must be a positive number"
      });
    }

    // Step 1: Find the zone for this province
    const { data: provinceData, error: provinceError } = await supabase
      .from("destination_provinces")
      .select("zone_id, shipping_zones(zone_name)")
      .ilike("province", province.trim())
      .single();

    if (provinceError || !provinceData) {
      // Fallback: if province not found, use a default high rate (Island/unknown)
      console.warn(`⚠️ Province not found: "${province}", using fallback rate`);

      const { data: fallback } = await supabase
        .from("shipping_rates")
        .select("base_fee, additional_per_kg, max_weight_kg, shipping_zones(zone_name)")
        .eq("destination_zone_id", 6) // Island/remote zone
        .lte("min_weight_kg", weight)
        .gte("max_weight_kg", weight)
        .single();

      if (fallback) {
        return res.json({
          success: true,
          fee: parseFloat(fallback.base_fee),
          zone: "Island (unknown province)",
          note: `Province "${province}" not found in database, applied Island rates`
        });
      }

      return res.status(404).json({
        success: false,
        error: `Province "${province}" not found and no fallback rate available`
      });
    }

    const zoneId = provinceData.zone_id;
    const zoneName = provinceData.shipping_zones?.zone_name || "Unknown";

    // Step 2: Find the shipping rate for this zone + weight bracket
    const { data: rateData, error: rateError } = await supabase
      .from("shipping_rates")
      .select("base_fee, additional_per_kg, max_weight_kg")
      .eq("destination_zone_id", zoneId)
      .lte("min_weight_kg", weight)
      .gte("max_weight_kg", weight)
      .single();

    if (rateError || !rateData) {
      // Weight is above all brackets — use the highest bracket + extra per kg
      const { data: maxRate } = await supabase
        .from("shipping_rates")
        .select("base_fee, additional_per_kg, max_weight_kg")
        .eq("destination_zone_id", zoneId)
        .order("max_weight_kg", { ascending: false })
        .limit(1)
        .single();

      if (maxRate) {
        const extraKg = Math.ceil(weight - maxRate.max_weight_kg);
        const extraFee = extraKg * parseFloat(maxRate.additional_per_kg || 0);
        const totalFee = parseFloat(maxRate.base_fee) + extraFee;

        return res.json({
          success: true,
          fee: parseFloat(totalFee.toFixed(2)),
          zone: zoneName,
          note: `Weight exceeds standard brackets; extra ₱${extraFee.toFixed(2)} added`
        });
      }

      return res.status(404).json({
        success: false,
        error: `No shipping rate found for zone ${zoneName} at ${weight}kg`
      });
    }

    console.log(`✅ Shipping calculated: ₱${rateData.base_fee} (${zoneName}, ${weight}kg)`);

    res.json({
      success: true,
      fee: parseFloat(rateData.base_fee),
      zone: zoneName
    });

  } catch (error) {
    console.error("❌ Shipping calculation error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;