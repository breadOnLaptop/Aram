import ChatList from "@/components/chat/ChatList";
import Header from "../components/chat/Header";
import InputBar from "@/components/chat/InputBar";
import MessageArea from "@/components/chat/MessageArea";
import React, { useState, useEffect } from "react";
import { Navigate, redirect, useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import LetterArea from "@/components/chat/LetterArea";
import { normalizeMarkdownChunk } from "../utils/formatAI";

const ChatPage = () => {

    const { authUser, getMessages, setCurrentChatId, currentChatId } = useAuthStore();
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [checkpointId, setCheckpointId] = useState("");
    const [receiving, setReceiving] = useState(false);
    let { chatId } = useParams();
    useEffect(() => {
        if (!chatId) redirect("/chat");
        setMessages([]);
        setCheckpointId("");
        setReceiving(false);

        // find the chat and set initial checkpointId
        const chat = authUser?.chats?.find(c => c._id === chatId);
        if (chat) {
            setCheckpointId(chat.checkpoint_id || "");
        }

        setCurrentChatId(chatId);

    }, [chatId, authUser?.chats, setCurrentChatId, currentChatId]);

    useEffect(() => {
        if (chatId == null) {
            return;
        }
        const fetchMessages = async () => {
            try {
                const msgs = await getMessages(chatId);
                setMessages(msgs.messages);
            } catch (err) {
                console.error("Failed to fetch messages:", err);
            }
        };

        if (chatId) fetchMessages();
    }, [chatId, getMessages]);



    const handleSubmit = async (e) => {
        e.preventDefault();
        setReceiving(true);
        console.log("Hi from handle Submit")
        if (currentMessage.trim()) {
            const newMessageId = messages.length + 1;

            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    id: newMessageId,
                    content: currentMessage,
                    isUser: true,
                    type: "message",
                },
            ]);

            const userInput = currentMessage;
            setCurrentMessage("");

            try {
                const aiResponseId = newMessageId + 1;
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        id: aiResponseId,
                        content: "",
                        isUser: false,
                        type: "message",
                        isLoading: true,
                        searchInfo: {
                            stages: [],
                            query: "",
                            urls: [],
                        },
                    },
                ]);
                const message = {
                    userId: authUser._id,
                    chatId: chatId,
                    query: userInput,
                    messageId: aiResponseId,
                };
                let url = `http://localhost:5000/api/chats/send?chatId=${chatId}&messageId=${newMessageId}&queryreceived=${encodeURIComponent(JSON.stringify(message))}`;
                if (checkpointId) {
                    url += `&checkpoint_id=${encodeURIComponent(checkpointId)}`;
                }

                const eventSource = new EventSource(url);
                let streamedContent = "";
                let searchData = { stages: [], query: "", urls: [], internalQuery: "", internalUrls: [], ragSources: [], error: null };

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        let newSearchInfo = { ...searchData, stages: [...searchData.stages] };
                        switch (data.type) {
                            case "checkpoint":
                                setCheckpointId(data.checkpoint_id);
                                newSearchInfo.stages.push("checkpoint");
                                break;
                            case "thinking":
                                newSearchInfo.stages.push("thinking");
                                break;
                            case "search_start":
                                newSearchInfo.stages.push("searching");
                                newSearchInfo.query = data.query;
                                break;
                            case "search_results":
                                newSearchInfo.stages.push("reading");
                                newSearchInfo.urls = Array.isArray(data.urls) ? data.urls : [];
                                break;
                            case "content":
                                const fixedChunk = normalizeMarkdownChunk(data.content);
                                streamedContent = normalizeMarkdownChunk(streamedContent + fixedChunk);
                                break;

                            case "search_error":
                                newSearchInfo.stages.push("error");
                                newSearchInfo.error = data.message;
                                setReceiving(false);
                                eventSource.close();
                                break;
                            case "end":
                                newSearchInfo.stages = newSearchInfo.stages.filter(stage => stage !== "writing");
                                setReceiving(false);
                                eventSource.close();
                                break;
                        }

                        // Remove duplicates to keep the list clean while preserving order
                        newSearchInfo.stages = Array.from(new Set(newSearchInfo.stages));
                        searchData = newSearchInfo;

                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === aiResponseId
                                    ? { ...msg, content: streamedContent, searchInfo: searchData, isLoading: false }
                                    : msg
                            )
                        );

                    } catch (error) {
                        console.error("Error parsing event data:", error, event.data);
                    }
                };

                eventSource.onerror = (error) => {
                    setReceiving(false);
                    console.error("EventSource error:", error);
                    eventSource.close();

                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === aiResponseId
                                ? {
                                    ...msg,
                                    content:
                                        "Sorry, there was an error processing your request.",
                                    isLoading: false,
                                }
                                : msg
                        )
                    );

                };

                eventSource.addEventListener("end", () => {
                    eventSource.close();
                    setReceiving(false);
                });
            } catch (error) {
                setReceiving(false);
                console.error("Error setting up EventSource:", error);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: newMessageId + 1,
                        content: "Sorry, there was an error connecting to the server.",
                        isUser: false,
                        type: "message",
                        isLoading: false,
                    },
                ]);
            }
        }
    };




    return (
        <div className="flex flex-col h-screen w-full bg-background">
            {/* Top Header */}
            <Header />

            {/* Scrollable messages (fills remaining space) */}
            <div className="flex-1 overflow-y-auto px-4 flex  justify-center w-full ">
                <MessageArea messages={messages} />
            </div>

            {/* Input bar fixed at bottom */}
            <div className="flex items-center bg-transparent justify-center w-full  z-50">
                <InputBar
                    currentMessage={currentMessage}
                    setCurrentMessage={setCurrentMessage}
                    onSubmit={handleSubmit}
                    disabled={receiving}
                />
            </div>
        </div>)


};

export default ChatPage;

