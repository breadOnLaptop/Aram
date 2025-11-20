import Message from "../models/messageModel.js";
import Contact from "../models/contactModel.js";
import asyncHandler from "express-async-handler";

// ======================================================
// 📤 Send Message
// ======================================================
const sendMessage = asyncHandler(async (req, res) => {
  const { contactId, senderId, receiverId, content, fileUrl } = req.body;

  if (!contactId || !senderId || !receiverId) {
    res.status(400);
    throw new Error("Contact ID, Sender ID, and Receiver ID are required");
  }

  const newMessage = await Message.create({
    contactId,
    senderId,
    receiverId,
    content: content || "",
    fileUrl: fileUrl || [],
    delivered: false,
    read: false,
  });

  // Update contact's last message
  await Contact.findByIdAndUpdate(contactId, {
    lastMessage: newMessage._id,
  });

  res.status(201).json(newMessage);
});

// ======================================================
// 📩 Get Messages for a Contact
// ======================================================
const getMessages = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  if (!contactId) {
    res.status(400);
    throw new Error("Contact ID is required");
  }

  const messages = await Message.find({ contactId }).sort({ createdAt: 1 });

  res.status(200).json(messages);
});

// ======================================================
// 🗑️ Delete Message
// ======================================================
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

// ======================================================
// ✓ Update Message Status (Read/Delivered)
// ======================================================
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

  // Update contact's last message timestamp
  await Contact.findByIdAndUpdate(updatedMessage.contactId, {
    updatedAt: new Date(),
  });

  // Emit socket event if io is available
  if (req.app.get('io')) {
    req.app.get('io').emit('messageStatusUpdate', {
      messageId,
      status: { delivered, read }
    });
  }

  res.status(200).json(updatedMessage);
});

export { sendMessage, getMessages, deleteMessage, updateMessageStatus };