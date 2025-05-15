import { useState, useEffect, useRef, useCallback } from "react";
import { Conversation } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewedTimestamps, setViewedTimestamps] = useState<
    Record<string, number>
  >({});
  const pollIntervalRef = useRef<number | null>(null);

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

  // Custom function to handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchConversations();
    setLastRefreshed(new Date());
    setIsRefreshing(false);
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
    };
  }, []);

  // Mark a conversation as viewed
  const markConversationAsViewed = useCallback((conversationId: string) => {
    setViewedTimestamps((prev) => ({
      ...prev,
      [conversationId]: Date.now(),
    }));
  }, []);

  // Visual indicator for new messages
  const hasNewMessages = useCallback(
    (conv: Conversation) => {
      const messageTime = new Date(conv.timestamp).getTime();
      const lastViewed = viewedTimestamps[conv.id] || 0;

      // Show new message indicator if:
      // 1. The message is newer than when the user last viewed this conversation
      // 2. AND the message is from the last polling cycle
      return (
        messageTime > lastViewed &&
        messageTime > lastRefreshed.getTime() - 10000
      );
    },
    [viewedTimestamps, lastRefreshed],
  );

  return {
    conversations,
    error,
    lastRefreshed,
    isRefreshing,
    fetchConversations,
    handleManualRefresh,
    hasNewMessages,
    markConversationAsViewed,
  };
}
