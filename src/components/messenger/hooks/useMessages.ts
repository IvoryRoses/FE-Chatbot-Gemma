// useMessages.ts
import { useState, useEffect, useRef } from "react";
import { Message, FacebookMessage } from "../types";

export function useMessages(
  selectedConversation: string | null,
  onSuccess?: () => Promise<any>,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesPollIntervalRef = useRef<number | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          // Also update conversations if callback provided
          if (onSuccess) {
            await onSuccess();
          }
        }
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  };

  // Send message function
  const sendMessage = async (recipientId: string | null) => {
    if (!newMessage.trim() || !recipientId || !selectedConversation) return;

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
            recipient: { id: recipientId },
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

        // Update conversation list if callback provided
        if (onSuccess) {
          await onSuccess();
        }
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

  // Scroll to bottom of messages whenever they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    newMessage,
    setNewMessage,
    sendMessage,
    fetchMessages,
    messagesEndRef,
  };
}
