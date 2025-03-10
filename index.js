const dotenv = require("dotenv")
dotenv.config()
const express = require("express")

const register = require("./routes/register.js")
const login = require("./routes/login.js")

const app = express()
const PORT = process.env.PORT || 5000

//middlewares
app.use(express.urlencoded({extended: false}))
app.use(express.json())

//Routes
app.use("/api/auth/register", register)
app.use("/api/auth/login", login)

app.listen(PORT, (error) => {
    if (error){
        console.log(error.message)
    }else {
        console.log(`Server running on PORT ${PORT}`)
    }
})