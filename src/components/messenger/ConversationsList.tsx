// ConversationsList.tsx
import { IoReload } from "react-icons/io5";
import { Conversation } from "./types";

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  lastRefreshed: Date;
  isRefreshing: boolean;
  hasNewMessages: (conv: Conversation) => boolean;
  handleManualRefresh: () => Promise<void>;
  onSelectConversation: (id: string) => void;
}

export default function ConversationsList({
  conversations,
  selectedConversation,
  lastRefreshed,
  isRefreshing,
  hasNewMessages,
  handleManualRefresh,
  onSelectConversation,
}: ConversationsListProps) {
  return (
    <div className="w-80 border-r border-[#4e4e4e] bg-[#171717]">
      <div className="flex items-center justify-between p-4">
        <div className="text-xl font-bold text-white">Conversations</div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`rounded-full p-2 text-white transition-colors hover:bg-[#222425] ${isRefreshing ? "animate-spin" : ""}`}
          title="Refresh conversations"
        >
          <IoReload />
        </button>
      </div>
      <div className="px-4 pb-2 text-xs text-gray-400">
        Last updated: {lastRefreshed.toLocaleTimeString()}
      </div>
      <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No conversations found
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`cursor-pointer border-b border-[#4e4e4e] p-4 hover:bg-[#222425] ${
                selectedConversation === conv.id ? "bg-[#222425]" : ""
              } ${hasNewMessages(conv) ? "border-l-4 border-l-red-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{conv.name}</span>
                <span className="text-xs text-gray-400">
                  {new Date(conv.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 truncate text-sm text-gray-400">
                {conv.lastMessage}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
