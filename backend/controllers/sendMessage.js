import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import Chat from "../models/chatModel.js";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

// 🔥 Global agent instance
let agent = null;

// Initialize LangGraph + Gemini once
async function ensureAgent() {
  if (agent) return agent;

  console.log("🧠 Initializing LangGraph React Agent…");

  const llm = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.2,
  });

  agent = createReactAgent({
    llm,
    tools: [], // You want search events, but no actual tools
    messageModifier: `
You are Aram AI — a structured, concise, and precise legal assistant from Indian Law.

FORMATTING REQUIREMENTS:
- Use clean Markdown with sections (##, ###).
- Keep paragraphs short (1–2 sentences).
- Always avoid unnecessary blank lines.
- Never break Markdown structures across streamed chunks.
- Emit bullet points and headings as complete units.
- Lists must use '-' or '1.' consistently.
- Place full URLs inside a "Sources" section.
- Do not repeat text or restate previous content.

CONTENT REQUIREMENTS:
- Provide legal information, not legal advice.
- Include definitions, elements, examples, and penalties when useful.
- Keep answers concise and logically structured.
- For serious legal harm topics, include safety guidance.
- Cite real legal sources when possible.

TONE:
- Professional, neutral, and helpful.
- No filler language or disclaimers beyond what is required.
    `,
    checkpointSaver: new MemorySaver()
  });

  console.log("✔ LangGraph agent ready");
  return agent;
}

// 🔥 MAIN STREAM FUNCTION
export const sendMessage = async (req, res) => {
  try {
    const { chatId, messageId, queryreceived, checkpoint_id } = req.query;
    const { query: userMessage } = JSON.parse(queryreceived);

    const graph = await ensureAgent();

    // 🟢 SSE SETUP
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = async (ev) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
      res.flush?.();
    };

    // Prepare conversation thread
    const threadId = checkpoint_id || crypto.randomUUID();
    const isNewThread = !checkpoint_id;

    if (isNewThread) {
      await send({ type: "checkpoint", checkpoint_id: threadId });
    }

    await send({ type: "thinking" });

    // 🟢 Track all search metadata to save to DB
    let searchInfo = {
      stages: [],
      query: "",
      urls: [],
      internalQuery: "",
      internalUrls: [],
      ragQuery: "",
      ragContext: "",
      error: null
    };

    // 🟢 Track the final AI response
    let assistantResponse = "";

    // 🟢 STREAM EVENTS
    const eventStream = await graph.streamEvents(
      {
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      },
      {
        version: "v2",
        configurable: { thread_id: threadId }
      }
    );

    for await (const event of eventStream) {
      const type = event.event;

      console.log("🔵 Event:", event.data.chunk);
      if (
        type === "on_chat_model_stream" &&
        event.data?.chunk?.content?.toLowerCase().includes("http")
      ) {
        const urls = [...event.data.chunk.content.matchAll(/https?:\/\/\S+/g)].map(m => m[0]);

        if (urls.length) {
          searchInfo.stages.push("searching");
          searchInfo.stages.push("reading");
          searchInfo.urls.push(...urls);
          await send({ type: "search_start", query: "Referenced sources" });
          await send({ type: "search_results", urls });
        }
      }

      // 🔹 Content chunks
      if (type === "on_chat_model_stream") {
        const chunk = event.data?.chunk?.content;
        if (chunk?.trim()) {
          const clean = chunk.replace(/\s+$/g, "");
          assistantResponse += clean;

          searchInfo.stages.push("writing");
          await send({ type: "content", content: clean });
        }
      }
    }

    // 🔹 END OF STREAM
    await send({ type: "end" });
    res.end();

    // ➕ Deduplicate stages
    searchInfo.stages = Array.from(new Set(searchInfo.stages));

    // 🟢 SAVE MESSAGES IN DB
    setImmediate(async () => {
      try {
        await Chat.findByIdAndUpdate(
          chatId,
          {
            $push: {
              messages: [
                {
                  role: "user",
                  content: userMessage,
                  messageId: Number(messageId),
                  timestamp: new Date()
                },
                {
                  role: "ai",
                  content: assistantResponse.trim(),
                  messageId: Number(messageId) + 1,
                  timestamp: new Date(),
                  searchInfo
                }
              ]
            },
            checkpoint_id: threadId
          },
          { new: true }
        );

        console.log("💾 Saved user + ai messages with searchInfo");
      } catch (err) {
        console.error("❌ DB save error:", err);
      }
    });

  } catch (err) {
    console.error("chatStream error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
  }
};
