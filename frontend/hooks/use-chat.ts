import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useSocket } from "@/components/context/socket-context";
import { User, Message } from "@/types/index";

interface UseChatProps {
  selectedUser: User | null;
  currentUserId: string;
}

export const useChat = ({ selectedUser, currentUserId }: UseChatProps) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [useFallback, setUseFallback] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const loadingRef = useRef<boolean>(false);
  const selectedUserRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const pendingOptimisticMessagesRef = useRef<Map<string, string>>(new Map());

  // Check connection status for fallback mode
  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => {
        setUseFallback(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setUseFallback(false);
    }
  }, [isConnected]);

  const markAsRead = useCallback(async () => {
    if (!selectedUser) return;

    try {
      await fetch(`/api/messages/mark-read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-other-user-id": selectedUser.id,
        },
      });

      if (socket && isConnected) {
        socket.emit("mark_read", {
          userId: currentUserId,
          otherUserId: selectedUser.id,
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [selectedUser, socket, isConnected, currentUserId]);

  const fetchMessages = useCallback(
    async (showLoading = true, force = false) => {
      if (!selectedUser) return;

      if (loadingRef.current && !force) {
        console.log("Already loading messages, skipping duplicate fetch");
        return;
      }

      if (selectedUserRef.current === selectedUser.id && !force) {
        console.log("Selected user hasn't changed, skipping duplicate fetch");
        return;
      }

      loadingRef.current = true;
      selectedUserRef.current = selectedUser.id;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(`/api/messages/direct`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-other-user-id": selectedUser.id,
          },
        });

        if (response.ok) {
          const data = await response.json();
          processedMessagesRef.current = new Set();
          data.forEach((msg: Message) => {
            processedMessagesRef.current.add(msg.id);
          });
          setMessages(data);
        } else {
          console.error("Failed to fetch messages");
          if (showLoading) {
            toast.error("Failed to load messages");
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        if (showLoading) {
          toast.error("Failed to load messages");
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
        loadingRef.current = false;
      }
    },
    [selectedUser]
  );

  // Initial fetch and cleanup on user change
  useEffect(() => {
    if (selectedUser && selectedUser.id !== selectedUserRef.current) {
      setMessages([]);
      processedMessagesRef.current = new Set();
      pendingOptimisticMessagesRef.current.clear();
      fetchMessages(true, true);
      markAsRead();
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };
  }, [selectedUser, fetchMessages, markAsRead, pollInterval]);

  // Polling fallback
  useEffect(() => {
    if (selectedUser && useFallback && !pollInterval) {
      const interval = setInterval(() => {
        fetchMessages(false);
      }, 3000); // Poll every 3 seconds

      setPollInterval(interval);
      return () => clearInterval(interval);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    };
  }, [selectedUser, useFallback, fetchMessages, pollInterval]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !selectedUser || !isConnected) return;

    const handleNewMessage = (message: Message) => {
      if (
        (message.senderId === currentUserId &&
          message.receiverId === selectedUser.id) ||
        (message.senderId === selectedUser.id &&
          message.receiverId === currentUserId)
      ) {
        setMessages((prevMessages) => {
          // Check if we've already processed this message ID
          if (processedMessagesRef.current.has(message.id)) {
            console.log(`Skipping duplicate message: ${message.id}`);
            return prevMessages;
          }

          const tempMessageContent = pendingOptimisticMessagesRef.current.get(
            message.content
          );
          if (tempMessageContent && message.senderId === currentUserId) {
            pendingOptimisticMessagesRef.current.delete(message.content);
            processedMessagesRef.current.add(message.id);

            return prevMessages
              .filter((msg) => msg.id !== tempMessageContent)
              .concat(message);
          }

          processedMessagesRef.current.add(message.id);
          return [...prevMessages, message];
        });

        if (message.senderId === selectedUser.id) {
          markAsRead();
        }
      }
    };

    const handleTypingStatus = (data: {
      userId: string;
      isTyping: boolean;
    }) => {
      if (data.userId === selectedUser.id) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTypingStatus);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTypingStatus);
    };
  }, [socket, selectedUser, currentUserId, isConnected, markAsRead]);

  const sendMessage = async (content: string) => {
    if (!selectedUser || !content.trim()) return;

    setIsSending(true);

    try {
      const tempId = `temp-${Date.now()}`;

      // Using Socket.io for instant message delivery if connected
      if (socket && isConnected && !useFallback) {
        const optimisticMessage: Message = {
          id: tempId,
          content,
          senderId: currentUserId,
          receiverId: selectedUser.id,
          createdAt: new Date().toISOString(),
          sender: {
            id: currentUserId,
            name: null,
            image: null,
          },
        };

        pendingOptimisticMessagesRef.current.set(content, tempId);
        processedMessagesRef.current.add(tempId);

        setMessages((prev) => [...prev, optimisticMessage]);

        socket.emit("send_message", {
          senderId: currentUserId,
          receiverId: selectedUser.id,
          content,
        });
      } else {
        // Fallback to REST API
        const response = await fetch("/api/messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receiverId: selectedUser.id,
            content,
          }),
        });

        if (response.ok) {
          const newMessage = await response.json();
          processedMessagesRef.current.add(newMessage.id);
          setMessages((prev) => [...prev, newMessage]);
        } else {
          console.error("Failed to send message");
          toast.error("Failed to send message");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);

      if (socket && isConnected && typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
        socket.emit("typing", {
          senderId: currentUserId,
          receiverId: selectedUser.id,
          isTyping: false,
        });
      }
    }
  };

  const sendTyping = (isCurrentlyTyping: boolean) => {
    if (!socket || !selectedUser || !isConnected || useFallback) return;

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    socket.emit("typing", {
      senderId: currentUserId,
      receiverId: selectedUser.id,
      isTyping: isCurrentlyTyping,
    });

    if (isCurrentlyTyping) {
      const timeout = setTimeout(() => {
        if (socket && isConnected) {
          socket.emit("typing", {
            senderId: currentUserId,
            receiverId: selectedUser.id,
            isTyping: false,
          });
        }
        setTypingTimeout(null);
      }, 3000);

      setTypingTimeout(timeout);
    }
  };

  return {
    messages,
    isLoading,
    isSending,
    isTyping,
    useFallback,
    sendMessage,
    sendTyping,
    markAsRead,
  };
};
