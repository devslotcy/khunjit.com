import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { MessageThread } from "@/components/message-thread";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Conversation, Message } from "@shared/schema";

type ConversationWithDetails = Conversation & {
  patientName?: string;
  patientAvatar?: string;
  lastMessage?: Message;
  unreadCount?: number;
};

export default function PsychologistMessages() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations list
  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${selectedConversation}/messages`],
    enabled: !!selectedConversation,
    staleTime: 0,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  // Refetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      refetchMessages();
    }
  }, [selectedConversation, refetchMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, { text });
      return response.json();
    },
    onSuccess: () => {
      // Immediately refetch messages after sending
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  const filteredConversations = conversations?.filter(conv =>
    conv.patientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <DashboardLayout role="psychologist">
      <div className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-0 lg:gap-6">
          {/* Conversations List */}
          <Card className={`border-card-border lg:col-span-1 flex flex-col overflow-hidden rounded-none sm:rounded-lg ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 sm:p-4 border-b border-card-border">
              <h2 className="font-serif text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t("messages.title")}</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("messages.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 sm:h-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      className={`w-full p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleSelectConversation(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                          <AvatarImage src={conv.patientAvatar || undefined} />
                          <AvatarFallback className="text-sm">
                            {conv.patientName?.split(' ').map(n => n[0]).join('') || 'H'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm sm:text-base truncate flex items-center gap-2">
                              {conv.patientName || "Danışan"}
                              {conv.patientId === 'system' && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Sistem</span>
                              )}
                            </p>
                            {conv.unreadCount && conv.unreadCount > 0 && (
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                              {conv.lastMessage.text}
                            </p>
                          )}
                          {conv.lastMessageAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                addSuffix: true,
                                locale: enUS
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? t("messages.noResults") : t("messages.empty")}
                  </p>
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Message Thread */}
          <Card className={`border-card-border lg:col-span-2 flex flex-col overflow-hidden rounded-none sm:rounded-lg ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
            {selectedConversation && selectedConv ? (
              <>
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-card-border flex items-center gap-3 bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0 -ml-1"
                    onClick={handleBack}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={selectedConv.patientAvatar || undefined} />
                    <AvatarFallback className="text-sm">
                      {selectedConv.patientName?.split(' ').map(n => n[0]).join('') || 'H'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{selectedConv.patientName || "Danışan"}</p>
                    <p className="text-xs text-muted-foreground">Danışan</p>
                  </div>
                </div>

                {/* Messages */}
                {messagesLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <MessageThread
                    messages={messages || []}
                    currentUserId={user?.id || ""}
                    otherUserName={selectedConv.patientName || "Danışan"}
                    otherUserImage={selectedConv.patientAvatar || undefined}
                    otherUserId={selectedConv.patientId}
                    onSendMessage={(text) => sendMessageMutation.mutate(text)}
                    isSending={sendMessageMutation.isPending}
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">{t("messages.selectConversation.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("messages.selectConversation.description")}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
