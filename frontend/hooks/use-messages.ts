import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
// Assuming the socket context is located here based on previous file analysis
import { useSocket } from "@/components/context/socket-context";
import { User, Project, Conversation } from "@/types/index";

export const useMessages = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
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

  // Refs to track info requests in progress
  const fetchingUserRef = useRef<Set<string>>(new Set());
  const fetchingProjectRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDirectConversations();
      fetchTeamConversations();

      // URL params for chat selection
      const email = searchParams.get("email");
      const projectId = searchParams.get("projectId");

      if (email) {
        fetchUserInfo(email);
      } else if (projectId) {
        fetchProjectInfo(projectId);
      }
    }
  }, [status, searchParams]);

  useEffect(() => {
    if (isMobile) {
      setShowConversationList(!selectedUser && !selectedProject);
    } else {
      setShowConversationList(true);
    }
  }, [selectedUser, selectedProject, isMobile]);

  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.id) return;

    const handleNewMessageSocket = (message: any) => {
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

    const handleNewTeamMessageSocket = (data: {
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

    socket.on("new_message", handleNewMessageSocket);
    socket.on("new_team_message", handleNewTeamMessageSocket);

    return () => {
      socket.off("new_message", handleNewMessageSocket);
      socket.off("new_team_message", handleNewTeamMessageSocket);
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
    if (fetchingUserRef.current.has(email)) {
      return;
    }

    if (selectedUser?.email === email) {
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
    if (fetchingProjectRef.current.has(projectId)) {
      return;
    }

    if (selectedProject?.id === projectId) {
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
          description: existingProject.description || null,
          creator: null, // We might not have the full creator object here, adjust as needed
          status: "IN_PROGRESS", // Default or fetch
          dueDate: null,
          members: [], // We might need to fetch members if not available
        } as any); // Using any temporarily to bypass strict Project type matching if data is partial
        // Actually, let's try to match the Project interface better or fetch full details
        // For now, I will stick to the original logic but adapt to the type.
        // The original code created a partial object.
        
        // If we need full project details, we might need to fetch them. 
        // But let's see if we can just use what we have.
         setSelectedProject({
          id: projectId,
          name: existingProject.name || "Project Chat",
          description: existingProject.description || null,
          status: "IN_PROGRESS", // Dummy
          dueDate: null,
          creator: null,
        } as Project);
        
        setSelectedUser(null);
        if (isMobile) {
          setShowConversationList(false);
        }
      } else {
        const response = await fetch(`/api/projects/${projectId}`);

        if (response.ok) {
          const project = await response.json();
          setSelectedProject(project); // Assuming API returns full Project object
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

  const handleSelectDirectConversation = (userId: string) => {
    if (selectedUser?.id === userId) return;

    const conversation = directConversations.find(
      (c: any) => c.userId === userId
    );
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

    const conversation = teamConversations.find(
      (c) => c.projectId === projectId
    );
    if (conversation) {
       // Construct a Project object from conversation data
       // Note: This might be incomplete compared to the full Project interface
       const projectData: Project = {
        id: projectId,
        name: conversation.name || "Project Chat",
        description: conversation.description || null,
        status: "IN_PROGRESS", // Default
        dueDate: null,
        creator: null, // Missing in conversation usually
       };

      setSelectedProject(projectData);
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

  return {
    session,
    status,
    directConversations,
    setDirectConversations,
    teamConversations,
    setTeamConversations,
    selectedUser,
    selectedProject,
    isLoading,
    isInitialRender,
    showConversationList,
    searchQuery,
    setSearchQuery,
    handleSelectConversation,
    handleNewMessage,
    handleBackClick,
    isMobile,
  };
};
