const mongoose = require("mongoose");

const Scheme = mongoose.Schema;

const userSchema = new Scheme(
    {
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            default: "I am new",
        },
        posts: [
            {
                type: Scheme.Types.ObjectId,
                ref: "Post",
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
