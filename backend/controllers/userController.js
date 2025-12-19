import User from '../models/userModel.js';
import bcrypt, { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from '../lib/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      mobile,
      age,
      role,
      latitude,
      longitude,
    } = req.body;

    const file = req.file;

    // Password validation
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include a letter, number, and special character",
      });
    }

    // Check email
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Check mobile
    existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(409).json({ message: "Mobile number already used" });
    }

    // Handle profile picture
    let profilePicUrl = null;
    if (file) {
      const upload = await cloudinary.uploader.upload(file.path, {
        folder: "users/profilePics",
      });
      profilePicUrl = upload.secure_url;
      fs.unlink(file.path, () => {});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const baseUserData = {
      firstName,
      lastName,
      mobile,
      age,
      profilePic: profilePicUrl,
      email,
      password: hashedPassword,
      role,
      chats: [],
      location: {
        type: "Point",
        coordinates:
          longitude && latitude
            ? [parseFloat(longitude), parseFloat(latitude)]
            : [0, 0],
      },
    };

    const newUser =
      role === "user"
        ? new User(baseUserData)
        : new User({
            ...baseUserData,
            field: [],
            description: "",
            experience: 0,
            rating: { count: 0, reviews: [] },
          });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password Incorrect' });
    }
    // Create JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    let safeUser = await User.findById(user._id).select('-password')
      .populate({
        path: "chats",
        options: { sort: { createdAt: -1 } }, // sorted
      });
    const obj = safeUser.toObject();
    const chats = obj.chats.map(chat => ({
      _id: chat._id,
      name: chat.name,
      checkpoint_id: chat.checkpoint_id,
      createdAt: chat.createdAt,
    }));


    res.status(200).json({ token, user: { ...obj, chats: chats } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate({
        path: "chats",
        options: { sort: { createdAt: -1 } } // sort newest → oldest
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const obj = user.toObject();
    const chats = (obj.chats || []).map((chat) => ({
      _id: chat._id,
      name: chat.name,
      checkpoint_id: chat.checkpoint_id,
      createdAt: chat.createdAt,
    }));
    res.status(200).json({ ...obj, chats: chats });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    let updates = { ...req.body };
    const file = req.file;
    console.log("Received profile update with data:", updates, "and file:", file);

    // Parse JSON fields if they exist
    if (updates.field) {
      try {
        updates.field = JSON.parse(updates.field);
      } catch {
        updates.field = [];
      }
    }

    if (updates.location) {
      try {
        updates.location = JSON.parse(updates.location);
      } catch {
        updates.location = undefined;
      }
    }

    // Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle profilePic
    let profilePicUrl = user.profilePic;
    if (file) {
      if (user.profilePic) {
        const parts = user.profilePic.split("/");
        const publicIdWithExt = parts[parts.length - 1]; // e.g. rnscw8ds9dasw0efte7r.jpg
        const publicId = publicIdWithExt.split(".")[0]; // remove .jpg

        await cloudinary.uploader.destroy(publicId);
      }

      const cloudinaryResponse = await cloudinary.uploader.upload(file.path, {
        folder: "users/profilePics",
      });
      console.log("Cloudinary upload response:", cloudinaryResponse);
      fs.unlink(file.path, (err) => {
        if (err) console.log("Error deleting temp file:", err);
        else console.log("Temp file deleted ✅");
      });

      profilePicUrl = cloudinaryResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { ...updates, profilePic: profilePicUrl },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error Updating Profile", error: error.message });
  }
};


export const findLawyers = async (req, res) => {
  try {
    const { field, q, longitude, latitude, maxDistance } = req.body;

    let filters = [{ role: "lawyer" }];

    if (q) {
      filters.push({
        $or: [
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { field: { $regex: q, $options: "i" } },
        ],
      });
    }

    if (field && field.length > 0) {
      const fields = Array.isArray(field) ? field : field.split(",");
      filters.push({ field: { $in: fields } });
    }

    const query = filters.length > 1 ? { $and: filters } : filters[0];

    let lawyers;
    if (longitude && latitude) {
      lawyers = await User.find({
        ...query,
      }).select("-password -chats");
    } else {
      lawyers = await User.find(query).select("-password -chats");
    }

    res.json(lawyers);
  } catch (error) {
    console.error("Error fetching lawyers:", error);
    res.status(500).json({ message: "Server error" });
  }
};
