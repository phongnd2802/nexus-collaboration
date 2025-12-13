import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useSocket } from "@/components/context/socket-context";

interface TeamChatMessage {
  id: string;
  content: string;
  userId: string;
  projectId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface TeamProject {
  id: string;
  name: string;
  description?: string;
  creator?: string;
  memberCount: number;
}

interface UseTeamChatProps {
  selectedProject: TeamProject | null;
  currentUserId: string;
}

export function useTeamChat({ selectedProject, currentUserId }: UseTeamChatProps) {
  const { socket, isConnected, joinTeamChat, leaveTeamChat, sendTeamMessage } =
    useSocket();
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef<boolean>(false);
  const selectedProjectRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const pendingOptimisticMessagesRef = useRef<Map<string, string>>(new Map());

  // Fetch messages
  const fetchMessages = useCallback(
    async (showLoading = true, force = false) => {
      if (!selectedProject) return;

      if (loadingRef.current && !force) {
        console.log("Already loading messages, skipping duplicate fetch");
        return;
      }

      if (selectedProjectRef.current === selectedProject.id && !force) {
        console.log(
          "Selected project hasn't changed, skipping duplicate fetch"
        );
        return;
      }

      loadingRef.current = true;
      selectedProjectRef.current = selectedProject.id;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(
          `/api/team-messages/project/${selectedProject.id}`
        );

        if (response.ok) {
          const data = await response.json();
          processedMessagesRef.current = new Set();
          pendingOptimisticMessagesRef.current.clear();

          data.forEach((msg: TeamChatMessage) => {
            processedMessagesRef.current.add(msg.id);
          });

          setMessages(data);
        } else {
          console.error("Failed to fetch team messages");
          if (showLoading) {
            toast.error("Failed to load team messages");
          }
        }
      } catch (error) {
        console.error("Error fetching team messages:", error);
        if (showLoading) {
          toast.error("Failed to load team messages");
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
        loadingRef.current = false;

        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    },
    [selectedProject]
  );

  // Initial fetch and join team chat when selectedProject changes
  useEffect(() => {
    if (selectedProject && selectedProject.id !== selectedProjectRef.current) {
      setMessages([]);
      processedMessagesRef.current = new Set();
      pendingOptimisticMessagesRef.current.clear();
      fetchMessages(true, true);
      if (selectedProject.id) {
        joinTeamChat(selectedProject.id);
      }
    }

    return () => {
      if (selectedProjectRef.current) {
        leaveTeamChat(selectedProjectRef.current);
      }
    };
  }, [selectedProject, fetchMessages, joinTeamChat, leaveTeamChat]);

  // Socket.IO event listener for new team messages
  useEffect(() => {
    if (!socket || !selectedProject || !isConnected) return;

    const handleNewTeamMessage = (data: {
      message: TeamChatMessage;
      projectId: string;
    }) => {
      if (data.projectId === selectedProject.id) {
        setMessages((prevMessages) => {
          if (processedMessagesRef.current.has(data.message.id)) {
            console.log(`Skipping duplicate message: ${data.message.id}`);
            return prevMessages;
          }

          const tempMessageContent = pendingOptimisticMessagesRef.current.get(
            data.message.content
          );
          if (tempMessageContent && data.message.userId === currentUserId) {
            pendingOptimisticMessagesRef.current.delete(data.message.content);
            processedMessagesRef.current.add(data.message.id);

            return prevMessages
              .filter((msg) => msg.id !== tempMessageContent)
              .concat(data.message);
          }

          processedMessagesRef.current.add(data.message.id);
          return [...prevMessages, data.message];
        });
      }
    };

    socket.on("new_team_message", handleNewTeamMessage);
    return () => {
      socket.off("new_team_message", handleNewTeamMessage);
    };
  }, [socket, selectedProject, isConnected, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (content: string) => {
    if (!selectedProject || !content.trim()) return;

    setIsSending(true);

    try {
      const tempId = `temp-${Date.now()}`;

      if (socket && isConnected) {
        const optimisticMessage = {
          id: tempId,
          content,
          userId: currentUserId,
          projectId: selectedProject.id,
          createdAt: new Date().toISOString(),
          user: {
            id: currentUserId,
            name: null,
            image: null,
          },
        };

        pendingOptimisticMessagesRef.current.set(content, tempId);
        processedMessagesRef.current.add(tempId);

        setMessages((prev) => [...prev, optimisticMessage]);

        sendTeamMessage(selectedProject.id, content);
      } else {
        // Fallback to REST API
        const response = await fetch("/api/team-messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: selectedProject.id,
            content,
          }),
        });

        if (response.ok) {
          const newMessage = await response.json();
          processedMessagesRef.current.add(newMessage.id);
          setMessages((prev) => [...prev, newMessage]);
        } else {
          console.error("Failed to send team message");
          toast.error("Failed to send message");
        }
      }
    } catch (error) {
      console.error("Error sending team message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  return {
    messages,
    isLoading,
    isSending,
    handleSendMessage,
    messagesEndRef,
    inputRef,
  };
}
