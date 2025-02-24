const dotenv = require("dotenv")
dotenv.config()
const express = require("express")


const route = express.Router()

route.post("/", (req, res) => {
    res.send("login")
})




module.exports = route