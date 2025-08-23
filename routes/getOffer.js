// routes/offers.js
const express = require("express");
const { db } = require("../db");
const router = express.Router();

// GET a specific offer with user details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await db.offer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,

            // add other fields you want exposed
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    res.json(offer);
  } catch (error) {
    console.error("Error fetching offer:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
