// MessageList.tsx
import { Message } from "./types";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessageList({
  messages,
  isLoading,
  error,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-700 p-3 text-white">{error}</div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            {isLoading
              ? "Loading messages..."
              : "No messages in this conversation"}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isFromPage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.isFromPage
                    ? "bg-red-500 text-white"
                    : "bg-[#222425] text-white"
                } ${message.id.startsWith("temp-") ? "opacity-70" : ""}`}
              >
                {message.content}
                <div className="mt-1 text-xs opacity-75">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div ref={messagesEndRef} /> {/* Empty div for scrolling to bottom */}
    </div>
  );
}
