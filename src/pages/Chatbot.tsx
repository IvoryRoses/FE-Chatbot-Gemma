import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { FaRobot } from "react-icons/fa";
import { IoSend } from "react-icons/io5";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Replaced fetch call with Google AI integration
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("API key not found in environment variables");
      return;
    }

    try {
      setIsLoading(true);
      const userMessage: Message = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Google AI initialization and chat handling
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      // Chat History
      const chat = model.startChat({
        history: messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user", // Role Mapping
          parts: [{ text: msg.content }],
        })) as Content[],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      // Generate response using Google AI
      const result = await chat.sendMessage(input);
      const response = await result.response;

      // assistant message to use Google AI response
      const assistantMessage: Message = {
        role: "assistant",
        content: response.text(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
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
            navigate("/"); // or use navigate("/") if you're using useNavigate
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
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything"
            className="flex-1 rounded border border-[#222425] bg-[#222425] p-2 text-white focus:border-[#4e4e4e] focus:outline-none"
            disabled={isLoading}
          />

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
  );
}
