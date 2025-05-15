import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { IoSend } from "react-icons/io5";
import { io } from "socket.io-client";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("new_message", (data) => {
      if (data.conversationId === selectedConversation) {
        fetchMessages();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedConversation]);

  // Function to fetch messages
  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${selectedConversation}/messages?fields=message,from,created_time&access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
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

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch conversations with shorter polling interval
  useEffect(() => {
    const fetchConversations = async () => {
      try {
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
              unread: false,
            };
          },
        );

        setConversations(formattedConversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
    const pollInterval = setInterval(fetchConversations, 5000); // Poll every 5 seconds
    return () => clearInterval(pollInterval);
  }, []);

  // Active conversation message polling
  useEffect(() => {
    if (!selectedConversation) return;

    const messagePoll = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(messagePoll);
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setIsLoading(true);

      const conversationResponse = await fetch(
        `https://graph.facebook.com/v18.0/${selectedConversation}?fields=participants&access_token=${import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN}`,
      );

      if (!conversationResponse.ok) {
        throw new Error("Failed to get conversation details");
      }

      const conversationData = await conversationResponse.json();
      const recipient = conversationData.participants.data.find(
        (p: any) => p.id !== import.meta.env.VITE_FB_PAGE_ID,
      );

      if (!recipient) {
        throw new Error("Recipient not found");
      }

      const response = await fetch(
        "https://graph.facebook.com/v18.0/me/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_type: "RESPONSE",
            recipient: { id: recipient.id },
            message: { text: newMessage },
            access_token: import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to send message: ${errorData.error?.message || "Unknown error"}`,
        );
      }

      const newMsg: Message = {
        id: Date.now().toString(),
        senderId: import.meta.env.VITE_FB_PAGE_ID,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isFromPage: true,
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");

      setTimeout(fetchMessages, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 flex h-screen w-screen bg-[#212121]">
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

      <div className="w-80 border-r border-[#4e4e4e] bg-[#171717]">
        <div className="p-4 text-xl font-bold text-white">Conversations</div>
        <div className="overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`cursor-pointer border-b border-[#4e4e4e] p-4 hover:bg-[#222425] ${
                selectedConversation === conv.id ? "bg-[#222425]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{conv.name}</span>
                <span className="text-xs text-gray-400">
                  {new Date(conv.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-400">
                {conv.lastMessage}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-[#171717]">
        {selectedConversation ? (
          <>
            <div className="flex flex-1 flex-col-reverse overflow-y-auto p-4">
              <div ref={messagesEndRef} />
              {messages
                .slice()
                .reverse()
                .map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isFromPage ? "justify-end" : "justify-start"
                    } mb-4`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.isFromPage
                          ? "bg-red-500 text-white"
                          : "bg-[#222425] text-white"
                      }`}
                    >
                      {message.content}
                      <div className="mt-1 text-xs opacity-75">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="border-t border-[#4e4e4e] p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded border border-[#222425] bg-[#222425] p-2 text-white focus:border-[#4e4e4e] focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className={`flex items-center rounded px-4 py-2 text-white ${
                    isLoading ? "bg-red-700" : "bg-red-500 hover:bg-red-600"
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
