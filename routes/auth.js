const { body } = require("express-validator");
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const User = require("../models/user");
const isAuth = require("../middleware/is-auth");

router.put(
    "/signup",
    [
        body("email")
            .trim()
            .isEmail()
            .withMessage("Please enter a valid email")
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then((user) => {
                    if (user) {
                        return Promise.reject("Email already exists!");
                    }
                });
            })
            .normalizeEmail(),
        body("password").trim().isLength({ min: 5 }),
        body("name").trim().not().isEmpty(),
    ],
    authController.signup
);

router.post("/login", authController.login);
router.get("/status", isAuth, authController.getUserStatus);
router.patch(
    "/status",
    isAuth,
    [
        body("status")
            .trim()
            .not()
            .isEmpty()
            .withMessage("Status cannot be empty!")
            .isLength({ max: 140 })
            .withMessage("Status must be less than 140 characters"),
    ],
    authController.updateUserStatus
);

module.exports = router;
