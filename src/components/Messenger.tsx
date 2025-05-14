import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { IoSend } from "react-icons/io5";
import { IoReload } from "react-icons/io5";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  recipientId: string; // Store PSID for sending messages
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isFromPage: boolean;
}

interface FacebookMessage {
  id: string;
  message: string;
  from: {
    id: string;
    name: string;
  };
  created_time: string;
}

export default function Messenger() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const messagesPollIntervalRef = useRef<number | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Custom function to handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchConversations();
    if (selectedConversation) {
      await fetchMessages(selectedConversation);
    }
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setError(null);
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/conversations?fields=participants,messages{message,from,created_time}&access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();

      const formattedConversations: Conversation[] = data.data.map(
        (conv: any) => {
          const participant = conv.participants.data.find(
            (p: any) => p.id !== import.meta.env.VITE_FB_PAGE_ID,
          );
          const lastMessage = conv.messages?.data[0];

          return {
            id: conv.id,
            name: participant?.name || "Unknown",
            lastMessage: lastMessage?.message || "No messages",
            timestamp: lastMessage?.created_time || new Date().toISOString(),
            unread: false, // TODO: Implement unread status
            recipientId: participant?.id || "", // Store PSID for sending messages
          };
        },
      );

      // Sort conversations by timestamp (newest first)
      formattedConversations.sort((a, b) => {
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      setConversations(formattedConversations);
      return formattedConversations;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load conversations. Please try again later.");
      return [];
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId = selectedConversation) => {
    if (!conversationId) return [];

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${conversationId}/messages?fields=message,from,created_time&access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();

      const formattedMessages: Message[] = data.data.map(
        (msg: FacebookMessage) => ({
          id: msg.id,
          senderId: msg.from.id,
          content: msg.message,
          timestamp: msg.created_time,
          isFromPage: msg.from.id === import.meta.env.VITE_FB_PAGE_ID,
        }),
      );

      // Store the timestamp of the newest message
      if (formattedMessages.length > 0) {
        const newestMessageTimestamp = formattedMessages[0].timestamp;
        lastMessageTimestampRef.current = newestMessageTimestamp;
      }

      // Sort messages by timestamp (oldest first)
      const sortedMessages = [...formattedMessages].sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      setMessages(sortedMessages);
      return sortedMessages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again later.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Check for new messages
  const checkForNewMessages = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${selectedConversation}/messages?limit=5&fields=message,from,created_time&access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
      );

      if (!response.ok) {
        throw new Error("Failed to check for new messages");
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const newestMessageTimestamp = data.data[0].created_time;

        // If there's a new message, update the message list
        if (
          !lastMessageTimestampRef.current ||
          new Date(newestMessageTimestamp).getTime() >
            new Date(lastMessageTimestampRef.current).getTime()
        ) {
          console.log("New message detected, updating messages");
          await fetchMessages(selectedConversation);
          // Also update conversations to reflect any changes
          await fetchConversations();
          setLastRefreshed(new Date());
        }
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchConversations();

    // Set up polling for conversations
    pollIntervalRef.current = window.setInterval(() => {
      fetchConversations().then(() => {
        setLastRefreshed(new Date());
      });
    }, 10000); // Poll conversations every 10 seconds

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
      }
      if (messagesPollIntervalRef.current !== null) {
        clearInterval(messagesPollIntervalRef.current);
      }
    };
  }, []);

  // Set up more frequent polling for messages when a conversation is selected
  useEffect(() => {
    // Clear previous interval if it exists
    if (messagesPollIntervalRef.current !== null) {
      clearInterval(messagesPollIntervalRef.current);
      messagesPollIntervalRef.current = null;
    }

    if (selectedConversation) {
      // Initial fetch
      fetchMessages(selectedConversation);

      // Set up more frequent polling for the selected conversation
      messagesPollIntervalRef.current = window.setInterval(() => {
        checkForNewMessages();
      }, 3000); // Check for new messages every 3 seconds
    } else {
      setMessages([]);
      lastMessageTimestampRef.current = null;
    }

    return () => {
      if (messagesPollIntervalRef.current !== null) {
        clearInterval(messagesPollIntervalRef.current);
      }
    };
  }, [selectedConversation]);

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

  // Updated send message function with proper Facebook API structure
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipientId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Add the sent message to the local state immediately for better UX
      const tempId = `temp-${Date.now()}`;
      const newMsg: Message = {
        id: tempId,
        senderId: import.meta.env.VITE_FB_PAGE_ID,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isFromPage: true,
      };

      setMessages((prevMessages) => [...prevMessages, newMsg]);
      const messageToSend = newMessage;
      setNewMessage("");

      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_type: "RESPONSE",
            recipient: { id: selectedRecipientId },
            message: { text: messageToSend },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Facebook API error:", errorData);

        // Remove the temporary message if sending failed
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== tempId),
        );

        throw new Error(
          `Failed to send message: ${errorData.error?.message || "Unknown error"}`,
        );
      }

      // Wait a moment for the message to register with Facebook
      setTimeout(async () => {
        // Fetch updated messages after successful send
        await fetchMessages(selectedConversation);

        // Update conversation list to reflect the new message
        await fetchConversations();
        setLastRefreshed(new Date());
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      setError(
        (error as Error).message || "Failed to send message. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pressing Enter key in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Visual indicator for new messages
  const hasNewMessages = (conv: Conversation) => {
    if (!selectedConversation || selectedConversation !== conv.id) {
      // Check if this conversation has messages newer than the last refresh
      const messageTime = new Date(conv.timestamp).getTime();
      const refreshTime = lastRefreshed.getTime() - 10000; // Subtract polling interval
      return messageTime > refreshTime;
    }
    return false;
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
                onClick={() => setSelectedConversation(conv.id)}
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

      {/* Messages Panel */}
      <div className="flex flex-1 flex-col bg-[#171717]">
        {selectedConversation ? (
          <>
            {/* Messages Container */}
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-700 p-3 text-white">
                    {error}
                  </div>
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
              <div ref={messagesEndRef} />{" "}
              {/* Empty div for scrolling to bottom */}
            </div>

            {/* Message Input */}
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
                  onClick={handleSendMessage}
                  disabled={isLoading || !newMessage.trim()}
                  className={`flex items-center rounded px-4 py-2 text-white ${
                    isLoading || !newMessage.trim()
                      ? "bg-red-700 opacity-50"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {isLoading ? "Sending..." : "Send"}{" "}
                  <IoSend className="ml-1" />
                </button>
              </div>
            </div>
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
