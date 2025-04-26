const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(
            "Validation failed, entered data is incorrect."
        );
        error.statusCode = 422;
        error.data = errors.array(); // Fixed this line
        throw error;
    }

    const { email, password, name } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error("Email address already exists!");
            error.statusCode = 409; // Conflict status code
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email,
            password: hashedPassword,
            name,
        });

        const newUser = await user.save();
        res.status(201).json({
            message: "User created successfully",
            userId: newUser._id,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        console.log("LOGIN USER: ", user);

        if (!user) {
            const error = new Error("Invalid email or password."); // Generic message for security
            error.statusCode = 401;
            throw error;
        }

        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Invalid email or password."); // Same message as above
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign(
            {
                email: user.email,
                userId: user._id.toString(),
            },
            process.env.JWT_SECRET || "super_secrete", // Add fallback for development
            { expiresIn: "1h" }
        );

        res.status(200).json({
            token,
            userId: user._id.toString(),
            expiresIn: 3600, // Send expiration time in seconds
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            const err = new Error("User not found!");
            err.statusCode = 404;
            throw err;
        }

        res.status(200).json({ status: user.status || "i am new" });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const err = new Error("Validation failed!");
            err.statusCode = 422;
            err.data = errors.array();
            throw err;
        }
        const newStatus = req.body.status;

        const user = await User.findById(req.userId);
        if (!user) {
            const err = new Error("User not found!");
            err.statusCode = 404;
            throw err;
        }

        user.status = newStatus;
        await user.save(); // Since this is async

        console.log("UPDATED STATUS: ", user.status);

        res.status(200).json({
            message: "User status updated",
            status: user.status, // Return updated status
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
