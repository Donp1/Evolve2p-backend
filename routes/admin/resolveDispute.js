// routes/disputes.js
const express = require("express");
const { isAdmin } = require("../../middlewares");
const { db } = require("../../db");

const router = express.Router();

router.post("/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { winner } = req.body; // "BUYER" or "SELLER"

  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!id) {
    return res.status(400).json({
      error: true,
      message: "Dispute ID is required",
    });
  }

  if (!["BUYER", "SELLER"].includes(winner)) {
    return res.status(400).json({
      error: true,
      message: "Winner must be either 'BUYER' or 'SELLER'",
    });
  }

  try {
    const dispute = await db.dispute.findUnique({
      where: { id },
      include: {
        trade: {
          include: { escrow: true },
        },
      },
    });

    if (!dispute) {
      return res
        .status(404)
        .json({ error: true, message: "Dispute not found" });
    }

    if (
      dispute.status === "RESOLVED_BUYER" ||
      dispute.status === "RESOLVED_SELLER"
    ) {
      return res
        .status(400)
        .json({ error: true, message: "Dispute already resolved" });
    }

    const { trade } = dispute;

    if (!trade || !trade.escrow || trade.escrow.released) {
      return res.status(400).json({
        error: true,
        message: "Escrow not available for release",
      });
    }

    const updated = await db.$transaction(async (tx) => {
      let winnerId = winner === "BUYER" ? trade.buyerId : trade.sellerId;

      // Credit winner’s wallet
      const wallet = await tx.wallet.findFirst({
        where: { userId: winnerId, currency: trade.escrow.crypto },
      });

      if (!wallet) {
        return res.status(404).json({
          error: true,
          message: "Winner wallet not found",
        });
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: Number(trade.amountCrypto) } },
      });

      // Mark escrow as released
      await tx.escrow.update({
        where: { tradeId: trade.id },
        data: { released: true },
      });

      // Update trade status
      await tx.trade.update({
        where: { id: trade.id },
        data: {
          status: "COMPLETED",
          escrowReleased: true,
        },
      });

      // Update dispute status
      return tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status:
            String(winner).toLowerCase() == "buyer"
              ? "RESOLVED_BUYER"
              : "RESOLVED_SELLER",
          resolvedAt: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: `Dispute resolved. Winner: ${winner}`,
      dispute: updated,
    });
  } catch (err) {
    console.error("❌ Resolve dispute error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
