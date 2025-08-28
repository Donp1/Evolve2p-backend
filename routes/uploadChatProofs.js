const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const router = express.Router();

// Multer setup (store file in memory as Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Convert buffer into a readable stream
const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // supports images, videos, pdf, etc.
        folder: "payment-proofs",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

cloudinary.config({
  secure: true,
});

const uploadImage = async (imagePath) => {
  // Use the uploaded file's name as the asset's public ID and
  // allow overwriting the asset with new versions
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log(result);
    return result.public_id;
  } catch (error) {
    console.error(error);
  }
};

// Endpoint: POST /api/upload-proof
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await streamUpload(req?.file?.buffer);
    if (!result)
      return res
        .status(500)
        .json({ error: true, message: "Unable to upload image" });

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      image_url: result?.secure_url,
    });
    console.log(result);

    // Pipe file buffer to Cloudinary stream
    // result.end(req.file.buffer);
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: true, message: "Server error" });
  }
});

module.exports = router;
