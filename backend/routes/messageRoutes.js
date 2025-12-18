import express from "express";

import { protect } from "../middlewares/authmiddleware.js";

import {
    sendMessage,
    getMessages,
    deleteMessage,
    updateMessageStatus
} from "../controllers/messageController.js";
import upload from "../lib/multer.js";

const router = express.Router();

router.post('/send', protect, upload.fields([{ name: 'files', maxCount: 10 }]), sendMessage);
router.get('/:contactId', protect, getMessages);
router.delete('/:messageId', protect, deleteMessage);
router.patch('/:messageId/status', protect, updateMessageStatus);

export default router;


