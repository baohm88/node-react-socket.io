const mongoose = require("mongoose");

const Scheme = mongoose.Schema;

const postSchema = new Scheme(
    {
        title: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        creator: {
            type: Scheme.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
