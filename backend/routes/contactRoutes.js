import express from "express";

import { protect } from "../middlewares/authmiddleware.js";

import { createContact, getContacts, deleteContact, updateLastMessage, getContact } from "../controllers/contactController.js";

const router = express.Router();

router.post("/", protect, createContact);
router.get("/:userId", protect, getContacts);
router.get("/get-contact", protect, getContact);
router.delete("/:contactId", protect, deleteContact);
router.patch("/:contactId/last-message", protect, updateLastMessage);

export default router;