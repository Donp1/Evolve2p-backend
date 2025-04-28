const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const createInquiry = await fetch(
      "https://api.withpersona.com/api/v1/inquiries",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.persona_api_key, // Replace with your real key (or call from backend)
        },
        body: JSON.stringify({
          data: {
            type: "inquiry",
            attributes: {
              inquiryTemplateId: process.env.persona_inquiry_template_id, // Replace with your actual template ID
              environment: "sandbox", // or 'production'
            },
          },
        }),
      }
    );

    const inquiryJson = await createInquiry.json();
    return res.json({ success: true, inquiry_id: inquiryJson?.data?.id });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
