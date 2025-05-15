// MessageInput.tsx
import { IoSend } from "react-icons/io5";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
}

export default function MessageInput({
  newMessage,
  setNewMessage,
  sendMessage,
  isLoading,
}: MessageInputProps) {
  // Handle pressing Enter key in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="border-t border-[#4e4e4e] p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 rounded border border-[#222425] bg-[#222425] p-2 text-white focus:border-[#4e4e4e] focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !newMessage.trim()}
          className={`flex items-center rounded px-4 py-2 text-white ${
            isLoading || !newMessage.trim()
              ? "bg-red-700 opacity-50"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isLoading ? "Sending..." : "Send"} <IoSend className="ml-1" />
        </button>
      </div>
    </div>
  );
}
