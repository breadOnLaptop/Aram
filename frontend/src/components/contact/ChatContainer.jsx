import React, { useEffect, useState, useRef } from "react";
import MessageBubble from "./MessageBubble";
import InputMessage from "./InputMessage";
import { Info, MoreHorizontal, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import NoChatContainer from "./NoChatContainer";
import { socketManager } from "../../utils/SocketManager";

const ChatContainer = () => {
  const {
    currentContact,
    getContactMessages,
    sendMessage,
    authUser,
    deleteMessage,
    updateMessageStatus,
    updateLastMessage,
    updateContactLastMessage,
    emitSocketEvent,
    socketConnected,
    onlineUsers,
    getContacts,
  } = useAuthStore();

  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messageAreaRef = useRef(null);

  const isContactOnline =
    currentContact?.contactUser?._id &&
    onlineUsers.includes(currentContact.contactUser._id);

  useEffect(() => {
    if (!currentContact?._id) return;
    getContactMessages(currentContact._id).then(setMessages);
  }, [currentContact?._id]);

  useEffect(() => {
    if (!socketConnected) return;

    const onReceive = async (msg) => {
      if (msg.contactId === currentContact?._id) {
        setMessages((prev) => [...prev, msg]);

        if (msg.senderId !== authUser._id) {
          await updateMessageStatus(msg._id, { delivered: true, read: true });
          socketManager.emit("messageStatusUpdate", {
            messageId: msg._id,
            status: { delivered: true, read: true },
          });
        }
      }

      if (authUser?._id) {
        await getContacts(authUser._id);
      }
    };

    socketManager.on("receiveMessage", onReceive);
    socketManager.on("userTyping", ({ isTyping }) => setIsTyping(isTyping));

    return () => {
      socketManager.off("receiveMessage", onReceive);
      socketManager.off("userTyping");
    };
  }, [socketConnected, currentContact, authUser]);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop =
        messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text, files = []) => {
    if (!text.trim() && !files.length) return;

    const sent = await sendMessage({
      contactId: currentContact._id,
      senderId: authUser._id,
      receiverId: currentContact.contactUser._id,
      text,
      files,
    });

    await updateLastMessage(currentContact._id, sent._id);
    updateContactLastMessage(currentContact._id, sent);
  };

  const handleTyping = (typing) => {
    emitSocketEvent("typing", {
      contactId: currentContact.contactUser._id,
      isTyping: typing,
    });
  };

  if (!currentContact) return <NoChatContainer />;

  return (
    <div className="flex flex-col w-full h-full bg-background rounded-xl border border-border shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentContact.contactUser.profilePic || "/images/user.jpg"}
              className="size-11 rounded-full object-cover"
              alt="user"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${
                isContactOnline ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {currentContact.contactUser.firstName}{" "}
              {currentContact.contactUser.lastName}
            </span>
            <span className="text-[11px] text-foreground/60">
              {isTyping ? (
                <span className="text-emerald-500">typing…</span>
              ) : isContactOnline ? (
                "Online"
              ) : (
                "Offline"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <Trash2
            className={`size-5 cursor-pointer ${
              selectedMessageId ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => {
              deleteMessage(selectedMessageId);
              setMessages((p) =>
                p.filter((m) => m._id !== selectedMessageId)
              );
              setSelectedMessageId(null);
            }}
          />
          <Info className="size-5 cursor-pointer" />
          <MoreHorizontal className="size-5 cursor-pointer" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messageAreaRef}
        className="flex-1 overflow-y-auto px-5 py-6 space-y-3 
                   bg-gradient-to-b from-background via-muted/30 to-muted/60
                   scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent w-full"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-foreground/60">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwnMessage={msg.senderId === authUser._id}
              selectedMessageId={selectedMessageId}
              setSelectedMessageId={setSelectedMessageId}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/95 backdrop-blur">
        <InputMessage onSubmit={send} onTyping={handleTyping} />
      </div>
    </div>
  );
};

export default ChatContainer;
