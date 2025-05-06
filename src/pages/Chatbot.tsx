import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { FaRobot } from "react-icons/fa";
import { IoSend, IoAdd, IoImage } from "react-icons/io5";
import toast, { Toaster } from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: {
    file: File;
    preview: string;
  };
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  //  New function to handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be less than 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        file,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Replaced fetch call with Google AI integration
  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("API key not found in environment variables");
      return;
    }

    try {
      setIsLoading(true);
      const userMessage: Message = {
        role: "user",
        content: input || "Here's an image: ",
        attachment: attachment
          ? {
              file: attachment.file,
              preview: attachment.preview,
            }
          : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      const chat = model.startChat({
        history: messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      });

      let result;
      if (attachment) {
        // Simplified image processing
        const imageBytes = await fetch(attachment.preview)
          .then((r) => r.blob())
          .then((blob) => blob.arrayBuffer());

        const uint8Array = new Uint8Array(imageBytes);
        const base64Data = btoa(
          uint8Array.reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );

        result = await chat.sendMessage([
          { text: input || "What's in this image?" },
          {
            inlineData: {
              data: base64Data,
              mimeType: attachment.file.type,
            },
          },
        ]);
      } else {
        result = await chat.sendMessage(input);
      }

      const response = await result.response;
      const assistantMessage: Message = {
        role: "assistant",
        content: response.text(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setInput("");
      setAttachment(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while sending the message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen flex-col items-center justify-center bg-[#212121]">
      <button
        className="absolute top-5 left-5 items-center rounded bg-red-500 p-2 text-white hover:bg-red-600"
        onClick={async () => {
          try {
            await signOut(auth);
            navigate("/");
          } catch (error) {
            console.error("Logout failed:", error);
          }
        }}
      >
        Log out
      </button>
      <h1 className="mb-4 flex items-center text-2xl font-bold text-red-500">
        J&S Chatbot <FaRobot size={50} className="ml-2" />
      </h1>
      <div className="relative flex h-[40rem] w-[30rem] flex-col rounded-md border border-[#4e4e4e] bg-[#171717] p-2">
        {/* Chat messages */}
        <div className="scrollbar-visible mb-4 flex-1 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`mr-2 max-w-[80%] rounded-lg p-2 ${
                  message.role === "user"
                    ? "bg-red-500 text-white"
                    : "bg-[#222425] text-white"
                } prose prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="m-0">{children}</p>,
                    ol: ({ children }) => (
                      <ol className="m-0 list-decimal pl-4">{children}</ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="m-0 list-disc pl-4">{children}</ul>
                    ),
                    li: ({ children }) => <li className="m-0">{children}</li>,
                  }}
                >
                  {message.content.trim()}
                </ReactMarkdown>
                {message.attachment && (
                  <div className="mt-2 flex items-center gap-2 text-sm opacity-75">
                    <IoImage />
                    <span>{message.attachment.file.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="animate-pulse rounded-lg bg-[#222425] p-3 text-white">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-2">
          {/* ADDED: Attachment preview */}
          {attachment && (
            <div className="flex items-center gap-2 rounded bg-[#2a2c2d] px-2 py-1">
              <IoImage className="text-white" />
              <span className="truncate text-sm text-white">
                {attachment.file.name}
              </span>
              <button
                onClick={() => setAttachment(null)}
                className="ml-auto text-white hover:text-red-500"
              >
                ×
              </button>
            </div>
          )}

          {/* MODIFIED: added drag and drop */}
          <div
            className="flex gap-2"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything"
              className="flex-1 rounded border border-[#222425] bg-[#222425] p-2 text-white focus:border-[#4e4e4e] focus:outline-none"
              disabled={isLoading}
            />

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="rounded bg-[#222425] px-3 text-white hover:bg-[#2a2c2d]"
            >
              <IoAdd />
            </button>

            <button
              onClick={handleSend}
              disabled={isLoading}
              className={`flex items-center rounded px-4 py-2 text-white ${
                isLoading ? "bg-red-700" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isLoading ? "Wait" : "Send"} <IoSend className="ml-1" />
            </button>
          </div>
        </div>
      </div>
      {/* ADDED: Toast notifications container */}
      <Toaster position="bottom-center" />
    </div>
  );
}
