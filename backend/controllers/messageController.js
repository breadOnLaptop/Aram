import fs from "fs";
import asyncHandler from "express-async-handler";
import cloudinary from "../lib/cloudinary.js";
import Message from "../models/messageModel.js";
import Contact from "../models/contactModel.js";

const sendMessage = asyncHandler(async (req, res) => {
  const { contactId, senderId, receiverId, content } = req.body;
  
  console.log("🚀 Sending message with files:", req.files);
  if (!contactId || !senderId || !receiverId) {
    res.status(400);
    throw new Error("Contact ID, sender ID, and receiver ID are required");
  }

  const uploadedFiles = [];

  if (req.files?.files?.length) {
    for (const file of req.files.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "chat/uploads",
        resource_type: "auto",
      });

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        fileType: result.resource_type,
        originalName: file.originalname,
      });

      fs.unlink(file.path, () => {});
    }
  }
  console.log("🚀 Sending message with files:", uploadedFiles);
  const newMessage = await Message.create({
    contactId,
    senderId,
    receiverId,
    content: content || "",
    fileUrl: uploadedFiles,
    delivered: false,
    read: false,
  });

  await Contact.findByIdAndUpdate(contactId, {
    lastMessage: newMessage._id,
    updatedAt: new Date(),
  });

  res.status(201).json(newMessage);
});

const getMessages = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  if (!contactId) {
    res.status(400);
    throw new Error("Contact ID is required");
  }

  const messages = await Message.find({ contactId }).sort({ createdAt: 1 });

  res.status(200).json(messages);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    res.status(400);
    throw new Error("Message ID is required");
  }

  const message = await Message.findByIdAndDelete(messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  res.status(200).json({ message: "Message deleted successfully" });
});

const updateMessageStatus = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { delivered, read } = req.body;

  if (!messageId) {
    res.status(400);
    throw new Error("Message ID is required");
  }

  const updateData = {};
  if (delivered !== undefined) updateData.delivered = delivered;
  if (read !== undefined) updateData.read = read;

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    updateData,
    { new: true }
  );

  if (!updatedMessage) {
    res.status(404);
    throw new Error("Message not found");
  }

  await Contact.findByIdAndUpdate(updatedMessage.contactId, {
    updatedAt: new Date(),
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("messageStatusUpdate", {
      messageId,
      delivered,
      read,
    });
  }

  res.status(200).json(updatedMessage);
});

export {
  sendMessage,
  getMessages,
  deleteMessage,
  updateMessageStatus,
};
