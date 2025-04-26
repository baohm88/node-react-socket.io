const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const { init: initSocket } = require("./socket");

const MONGODB_URI =
    "mongodb+srv://baohm88:123-Tarkeez@cluster0.0cprp.mongodb.net/messages?retryWrites=true&w=majority";

// Create express app
const app = express();

// Middlewares
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images");
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + "-" + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
    ) {
        cb(null, true);
    } else cb(null, false);
};
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    next();
});

// Routes
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

// Errors handling
app.use((err, req, res, next) => {
    console.log("APP ERROR: ", err);
    const status = err.statusCode || 500;
    const message = err.message;
    const data = err.data;
    res.status(status).json({ message, data });
});

// Connect to MongoDB and start server
const PORT = 8080;
mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        tls: true,
        tlsAllowInvalidCertificates: true, // Only for development!
    })
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log("Server running on http://localhost:" + PORT);
        });
        const io = initSocket(server);
        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);
            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });
    })
    .catch((err) => {
        console.log("MongoDB connection error: ", err);
    });
