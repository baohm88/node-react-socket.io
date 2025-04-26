const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");
const { getIO } = require("../socket");

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate("creator")
            .sort({ createdAt: -1 }) // Newest first
            .skip((currentPage - 1) * perPage)
            .limit(perPage);
        res.status(200).json({
            message: "Fetch posts successfully",
            posts,
            totalItems,
        });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};

exports.createPost = async (req, res, next) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error(
                "Validation failed, entered data is incorrect."
            );
            error.statusCode = 422;
            throw error;
        }
        if (!req.file) {
            const error = new Error("No image provided.");
            error.statusCode = 422;
            throw error;
        }

        const imageUrl = req.file.path;
        const { title, content } = req.body;

        // Create and save post
        const post = new Post({
            title,
            content,
            imageUrl,
            creator: req.userId,
        });

        await post.save();

        // Find user and update their posts array
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }
        user.posts.push(post);
        await user.save();

        // Emit the event
        getIO().emit("posts", {
            action: "create",
            post: {
                ...post._doc,
                creator: { _id: user._id, name: user.name },
            },
        });
        // Return response
        res.status(201).json({
            message: "Post created successfully!",
            post,
            creator: { _id: user._id, name: user.name },
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        if (!post) {
            const err = new Error("Post not found!");
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json({ message: "Post fetched successfully!", post });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;

        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("Validation failed! Invalid input!");
            error.statusCode = 422;
            throw error;
        }

        const { title, content } = req.body;
        let imageUrl = req.body.image;

        if (req.file) {
            imageUrl = req.file.path;
        }

        // Find the post
        const post = await Post.findById(postId).populate("creator");
        if (!post) {
            const error = new Error("Post not found");
            error.statusCode = 404;
            throw error;
        }

        // Check authorization
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error("Not authorized");
            error.statusCode = 403;
            throw error;
        }

        // Update image if provided
        if (imageUrl) {
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl);
            }
            post.imageUrl = imageUrl;
        }
        post.title = title;
        post.content = content;
        await post.save();

        // Emit the event
        getIO().emit("posts", {
            action: "update",
            post: {
                ...post._doc,
            },
        });
        // Return response
        res.status(200).json({
            message: "Post updated successfully!",
            post,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;

        // Find the post
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error("Could not find post");
            error.statusCode = 404;
            throw error;
        }

        // Check authorization
        if (post.creator.toString() !== req.userId) {
            const error = new Error("Not authorized");
            error.statusCode = 403;
            throw error;
        }

        // Delete associated image file if it exists
        if (post.imageUrl) {
            clearImage(post.imageUrl);
        }

        // Delete the post from DB
        await Post.findByIdAndDelete(postId);

        // Remove the post ref from user's posts array
        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { $pull: { posts: postId } },
            { new: true }
        );

        // Emit the event
        getIO().emit("posts", {
            action: "delete",
            post: postId,
        });
        // Return response
        res.status(200).json({
            message: "Post deleted successfully",
            post: updatedUser, // Return the updated user doc
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.log("Error deleting image: ", err);
        } else {
            console.log("Successfully deleted image:", filePath);
        }
    });
};
