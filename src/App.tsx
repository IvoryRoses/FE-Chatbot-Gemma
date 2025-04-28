import { FaRobot } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      // Add user message immediately
      const userMessage: Message = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput(""); // Clear input right away

      const res = await fetch("http://localhost:8000/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
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
      <h1 className="mb-4 flex items-center text-2xl font-bold text-red-200">
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
                }`}
              >
                {message.content}
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
