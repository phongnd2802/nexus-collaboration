import React, { Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessagesLayout } from "@/hooks/useMessagesLayout";
import { useTranslations } from "next-intl";

const ConversationList = lazy(() => import("./ConversationList"));
const Chat = lazy(() => import("./Chat"));
const TeamChat = lazy(() => import("./TeamChat"));
const NewMessageButton = lazy(() => import("./NewMessageButton"));
const EmptyState = lazy(() => import("./EmptyState"));

const MessagesLayout = () => {
  const t = useTranslations("MessagesPage");
  const isMobile = useIsMobile();
  const router = useRouter();

  const {
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
    handleSelectConversation,
    handleNewMessage,
    handleBackClick,
    handleDirectConversationsUpdate,
    handleTeamConversationsUpdate,
  } = useMessagesLayout({ isMobile });

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  if (isLoading && isInitialRender) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  // Authentication redirect
  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/messages");
    return null;
  }

  return (
    <div
      className={`flex ${
        isMobile ? "h-[calc(100vh-9rem)]" : "h-[calc(100vh-7rem)]"
      } overflow-hidden bg-background rounded-lg border w-auto`}
    >
      {showConversationList && (
        <div
          className={`${isMobile ? "w-full" : "w-80"} border-r flex flex-col`}
        >
          <div className="p-3 border-b">
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Suspense
                fallback={<Skeleton className="h-10 w-full rounded-md" />}
              >
                <NewMessageButton onSelectUser={handleNewMessage} />
              </Suspense>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full rounded-md" />
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                }
              >
                <ConversationList
                  conversations={directConversations}
                  teamConversations={teamConversations}
                  selectedId={selectedUser?.id || selectedProject?.id || null}
                  onSelectConversation={handleSelectConversation}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onConversationsUpdate={handleDirectConversationsUpdate}
                  onTeamConversationsUpdate={handleTeamConversationsUpdate}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          isLoading ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <Skeleton className="h-10 w-48 rounded-md" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      i % 2 === 0 ? "justify-start" : "justify-end"
                    }`}
                  >
                    <Skeleton className={`h-12 w-4/5 max-w-md rounded-lg`} />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b">
                    <Skeleton className="h-10 w-48 rounded-md" />
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          i % 2 === 0 ? "justify-start" : "justify-end"
                        }`}
                      >
                        <Skeleton
                          className={`h-12 w-4/5 max-w-md rounded-lg`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t">
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                </div>
              }
            >
              <Chat
                selectedUser={selectedUser}
                currentUserId={session?.user?.id || ""}
                onBackClick={isMobile ? handleBackClick : undefined}
              />
            </Suspense>
          )
        ) : selectedProject ? (
          isLoading ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <Skeleton className="h-10 w-48 rounded-md" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      i % 2 === 0 ? "justify-start" : "justify-end"
                    }`}
                  >
                    <Skeleton className={`h-12 w-4/5 max-w-md rounded-lg`} />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b">
                    <Skeleton className="h-10 w-48 rounded-md" />
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          i % 2 === 0 ? "justify-start" : "justify-end"
                        }`}
                      >
                        <Skeleton
                          className={`h-12 w-4/5 max-w-md rounded-lg`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t">
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                </div>
              }
            >
              <TeamChat
                selectedProject={selectedProject}
                currentUserId={session?.user?.id || ""}
                onBackClick={isMobile ? handleBackClick : undefined}
              />
            </Suspense>
          )
        ) : (
          !showConversationList && (
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center">
                  <Skeleton className="h-48 w-64 rounded-md" />
                </div>
              }
            >
              <EmptyState />
            </Suspense>
          )
        )}
      </div>

      {/* Floating loading indicator for subsequent data fetches */}
      {isLoading && !isInitialRender && (
        <div className="fixed bottom-4 right-4 bg-background shadow-lg rounded-full p-2 z-50 border">
          <Loader2 className="h-6 w-6 animate-spin text-main" />
        </div>
      )}
    </div>
  );
};

export default MessagesLayout;
