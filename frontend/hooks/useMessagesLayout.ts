import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSocket } from "@/components/context/socket-context";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  creator: string;
  memberCount: number;
}

interface Conversation {
  lastMessageAt: string;
  lastMessageContent: string;
  unreadCount: number;
  userId?: string;
  user?: User;
  projectId?: string;
  isTeamChat?: boolean;
  name?: string;
  description?: string;
  creator?: string;
  memberCount?: number;
  lastMessageSender?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface UseMessagesLayoutProps {
  isMobile: boolean;
}

export function useMessagesLayout({ isMobile }: UseMessagesLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  const [directConversations, setDirectConversations] = useState<Conversation[]>([]);
  const [teamConversations, setTeamConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [showConversationList, setShowConversationList] = useState(
    !isMobile || (!searchParams.get("email") && !searchParams.get("projectId"))
  );
  const [searchQuery, setSearchQuery] = useState("");

  const fetchingUserRef = useRef<Set<string>>(new Set());
  const fetchingProjectRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Fetch conversations
  const fetchDirectConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/conversations");
      if (response.ok) {
        const data = await response.json();
        setDirectConversations(data);
      } else {
        console.error("Failed to fetch direct conversations");
        toast.error("Failed to load conversations");
      }
    } catch (error) {
      console.error("Error fetching direct conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamConversations = async () => {
    try {
      const response = await fetch("/api/team-messages/projects");
      if (response.ok) {
        const data = await response.json();
        setTeamConversations(data);
      } else {
        console.error("Failed to fetch team conversations");
        toast.error("Failed to load team conversations");
      }
    } catch (error) {
      console.error("Error fetching team conversations:", error);
      toast.error("Failed to load team conversations");
    }
  };

  const fetchUserInfo = async (email: string) => {
    if (fetchingUserRef.current.has(email) || selectedUser?.email === email) {
      return;
    }

    fetchingUserRef.current.add(email);

    try {
      const response = await fetch(`/api/user/byEmail?email=${email}`);
      if (response.ok) {
        const user = await response.json();
        setSelectedUser(user);
        setSelectedProject(null);
        if (isMobile) {
          setShowConversationList(false);
        }
      } else {
        console.error("Failed to fetch user info");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    } finally {
      fetchingUserRef.current.delete(email);
    }
  };

  const fetchProjectInfo = async (projectId: string) => {
    if (fetchingProjectRef.current.has(projectId) || selectedProject?.id === projectId) {
      return;
    }

    fetchingProjectRef.current.add(projectId);

    try {
      const existingProject = teamConversations.find(
        (conv) => conv.projectId === projectId
      );

      if (existingProject) {
        setSelectedProject({
          id: projectId,
          name: existingProject.name || "Project Chat",
          description: existingProject.description,
          creator: existingProject.creator || "",
          memberCount: existingProject.memberCount || 0,
        });
        setSelectedUser(null);
        if (isMobile) {
          setShowConversationList(false);
        }
      } else {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          setSelectedProject({
            id: projectId,
            name: project.name,
            description: project.description,
            creator: project.creator.name,
            memberCount: project.members.length,
          });
          setSelectedUser(null);
          if (isMobile) {
            setShowConversationList(false);
          }
        } else {
          console.error("Failed to fetch project info");
        }
      }
    } catch (error) {
      console.error("Error fetching project info:", error);
    } finally {
      fetchingProjectRef.current.delete(projectId);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchDirectConversations();
      fetchTeamConversations();

      const email = searchParams.get("email");
      const projectId = searchParams.get("projectId");

      if (email) {
        fetchUserInfo(email);
      } else if (projectId) {
        fetchProjectInfo(projectId);
      }
    }
  }, [status, searchParams]);

  // Mobile responsiveness
  useEffect(() => {
    if (isMobile) {
      setShowConversationList(!selectedUser && !selectedProject);
    } else {
      setShowConversationList(true);
    }
  }, [selectedUser, selectedProject, isMobile]);

  // Toast notifications for new messages
  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.id) return;

    const handleNewMessage = (message: any) => {
      if (
        selectedUser &&
        (message.senderId === selectedUser.id ||
          message.receiverId === selectedUser.id)
      ) {
        return;
      }

      if (message.senderId !== session.user.id) {
        const sender = directConversations.find(
          (c) => c.userId === message.senderId
        );
        const senderName = sender?.user?.name || "Someone";
        toast(`New message from ${senderName}`, {
          description:
            message.content.length > 50
              ? message.content.substring(0, 50) + "..."
              : message.content,
          action: {
            label: "View",
            onClick: () => handleSelectDirectConversation(message.senderId),
          },
        });
      }
    };

    const handleNewTeamMessage = (data: {
      message: any;
      projectId: string;
    }) => {
      if (selectedProject && selectedProject.id === data.projectId) {
        return;
      }

      if (data.message.userId !== session.user.id) {
        const project = teamConversations.find(
          (c) => c.projectId === data.projectId
        );
        const projectName = project?.name || "Project";
        const senderName = data.message.user?.name || "Someone";

        toast(`New message in ${projectName}`, {
          description: `${senderName}: ${
            data.message.content.length > 50
              ? data.message.content.substring(0, 50) + "..."
              : data.message.content
          }`,
          action: {
            label: "View",
            onClick: () => handleSelectTeamConversation(data.projectId),
          },
        });
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_team_message", handleNewTeamMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_team_message", handleNewTeamMessage);
    };
  }, [
    socket,
    isConnected,
    session?.user?.id,
    selectedUser,
    selectedProject,
    directConversations,
    teamConversations,
  ]);

  // Conversation selection handlers
  const handleSelectDirectConversation = (userId: string) => {
    if (selectedUser?.id === userId) return;

    const conversation = directConversations.find((c: any) => c.userId === userId);
    if (conversation && conversation.user) {
      setSelectedUser(conversation.user);
      setSelectedProject(null);
      router.push(`/messages`);
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  };

  const handleSelectTeamConversation = (projectId: string) => {
    if (selectedProject?.id === projectId) return;

    const conversation = teamConversations.find((c) => c.projectId === projectId);
    if (conversation) {
      setSelectedProject({
        id: projectId,
        name: conversation.name || "Project Chat",
        description: conversation.description,
        creator: conversation.creator || "",
        memberCount: conversation.memberCount || 0,
      });
      setSelectedUser(null);
      router.push(`/messages?projectId=${projectId}`);
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    if (conversation.isTeamChat && conversation.projectId) {
      handleSelectTeamConversation(conversation.projectId);
    } else if (conversation.userId) {
      handleSelectDirectConversation(conversation.userId);
    }
  };

  const handleNewMessage = (user: User) => {
    setSelectedUser(user);
    setSelectedProject(null);
    router.push(`/messages`);
    if (isMobile) {
      setShowConversationList(false);
    }

    const existingConversation = directConversations.find(
      (c) => c.userId === user.id
    );

    if (!existingConversation) {
      const newConversation: Conversation = {
        userId: user.id,
        user,
        lastMessageAt: new Date().toISOString(),
        lastMessageContent: "",
        unreadCount: 0,
      };
      setDirectConversations([newConversation, ...directConversations]);
    }
  };

  const handleBackClick = () => {
    setSelectedUser(null);
    setSelectedProject(null);
    router.push("/messages");
    setShowConversationList(true);
  };

  const handleDirectConversationsUpdate = (updatedConversations: Conversation[]) => {
    setDirectConversations(updatedConversations);
  };

  const handleTeamConversationsUpdate = (updatedConversations: Conversation[]) => {
    setTeamConversations(updatedConversations);
  };

  return {
    // State
    directConversations,
    teamConversations,
    selectedUser,
    selectedProject,
    isLoading,
    isInitialRender,
    showConversationList,
    searchQuery,
    setSearchQuery,
    status,
    session,
    
    // Handlers
    handleSelectConversation,
    handleNewMessage,
    handleBackClick,
    handleDirectConversationsUpdate,
    handleTeamConversationsUpdate,
  };
}
