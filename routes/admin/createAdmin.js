const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // ✅ Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: true,
        message: "Email, password and name are required",
      });
    }

    // ✅ Validate role (optional: default to SUPPORT)
    const validRoles = ["SUPERADMIN", "SUPPORT", "COMPLIANCE"];
    const adminRole = role && validRoles.includes(role) ? role : "SUPPORT";

    // ✅ Check if admin already exists
    const adminExists = await db.admin.findFirst({ where: { email } });
    if (adminExists) {
      return res
        .status(400)
        .json({ error: true, message: "Email already in use" });
    }

    const strongPassword =
      /^(?=.{6,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>\/?\\|~]).+$/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error: true,
        message:
          "Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    // ✅ Hash password
    const securePassword = await bcrypt.hash(password, 10);

    // ✅ Create new admin
    const newAdmin = await db.admin.create({
      data: {
        email,
        password: securePassword,
        name,
        role: adminRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      error: false,
      message: "Admin created successfully",
      admin: newAdmin,
    });
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
