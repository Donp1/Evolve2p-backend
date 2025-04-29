const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { inquiry_id } = req.body;

  if (!inquiry_id) {
    return res.json({ error: true, message: "Provide an Inquiry ID" });
  }

  try {
    const createInquiry = await fetch(
      `https://api.withpersona.com/api/v1/inquiries/${inquiry_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.persona_api_key, // Replace with your real key (or call from backend)
        },
      }
    );

    const inquiryJson = await createInquiry.json();
    const status = inquiryJson?.data?.attributes?.status;
    return res.json({ success: true, status });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
