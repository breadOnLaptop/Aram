import mongoose from "mongoose";
import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import { generateChatName, safeJSONParse } from "../lib/utils.js";

/**
 * Create a new chat with a default welcome message
 */
export const createChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const name = generateChatName();
    // create chat with default AI message
    const chat = await Chat.create({
      user: userId,
      name: name,
      messages: [],
    });

    // push chatId to user (at start of list, sorted)
    await User.findByIdAndUpdate(userId, {
      $push: { chats: { $each: [chat._id], $position: 0 } },
    });

    res.status(201).json({
      _id: chat._id,
      name: chat.name,
      createdAt: chat.createdAt
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
};
/**
 * Get all messages in a chat
 */
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Sort messages by messageid (ascending)
    const sortedMessages = [...chat.messages].sort((a, b) => a.messageId - b.messageId);

    res.status(200).json({ messages: sortedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId; // assuming protect middleware sets req.user

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    // find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // ensure user owns this chat
    if (userId && chat.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this chat" });
    }

    // delete chat
    await Chat.findByIdAndDelete(chatId);

    // remove chat reference from user's chats list
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $pull: { chats: chatId },
      });
    }

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
};