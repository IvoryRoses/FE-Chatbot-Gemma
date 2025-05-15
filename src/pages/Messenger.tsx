import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// Import custom components
import ConversationsList from "../components/messenger/ConversationsList";
import MessageList from "../components/messenger/MessageList";
import MessageInput from "../components/messenger/MessageInput";

// Import custom hooks
import { useConversations } from "../components/messenger/hooks/useConversations";
import { useMessages } from "../components/messenger/hooks/useMessages";

export default function Messenger() {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );

  // Use custom hooks
  const {
    conversations,
    lastRefreshed,
    isRefreshing,
    fetchConversations,
    handleManualRefresh,
    hasNewMessages,
    markConversationAsViewed,
  } = useConversations();

  const {
    messages,
    isLoading,
    error: messagesError,
    newMessage,
    setNewMessage,
    sendMessage,
    messagesEndRef,
  } = useMessages(selectedConversation, fetchConversations);

  // Set selected recipient ID when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(
        (conv) => conv.id === selectedConversation,
      );
      if (conversation) {
        setSelectedRecipientId(conversation.recipientId);
      }
    } else {
      setSelectedRecipientId(null);
    }
  }, [selectedConversation, conversations]);

  // Handler for selecting a conversation
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Mark as viewed immediately when clicked
    markConversationAsViewed(conversationId);
  };

  // Handler for sending messages
  const handleSendMessage = () => {
    sendMessage(selectedRecipientId);
  };

  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen bg-[#212121]">
      {/* Navigation buttons */}
      <div className="absolute top-5 left-5 flex gap-2">
        <button
          className="rounded bg-red-500 p-2 text-white hover:bg-red-600"
          onClick={() => navigate("/chat")}
        >
          Back to Chat
        </button>
        <button
          className="rounded bg-red-500 p-2 text-white hover:bg-red-600"
          onClick={() => signOut(auth)}
        >
          Log out
        </button>
      </div>

      {/* Conversations Panel */}
      <ConversationsList
        conversations={conversations}
        selectedConversation={selectedConversation}
        lastRefreshed={lastRefreshed}
        isRefreshing={isRefreshing}
        hasNewMessages={hasNewMessages}
        handleManualRefresh={handleManualRefresh}
        onSelectConversation={handleSelectConversation}
      />

      {/* Messages Panel */}
      <div className="flex flex-1 flex-col bg-[#171717]">
        {selectedConversation ? (
          <>
            {/* Messages Container */}
            <MessageList
              messages={messages}
              isLoading={isLoading}
              error={messagesError}
              messagesEndRef={messagesEndRef}
            />

            {/* Message Input */}
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
