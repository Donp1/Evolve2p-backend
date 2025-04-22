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

    if (inquiryJson?.data?.id) {
      const createVerifyLink = await fetch(
        "https://api.withpersona.com/api/v1/inquiries/" +
          inquiryJson?.data?.id +
          "/generate-one-time-link",
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
                redirectUri: "http://helloworld.coms",
              },
            },
          }),
        }
      );

      const verifyLinkJson = await createVerifyLink.json();
      console.log(verifyLinkJson);
      return res.json({
        success: true,
        url: verifyLinkJson?.meta["one-time-link"],
      });
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
