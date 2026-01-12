import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { MessageThread } from "@/components/message-thread";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import type { Conversation, Message, PsychologistProfile } from "@shared/schema";

type ConversationWithDetails = Conversation & {
  psychologist: PsychologistProfile;
  lastMessage?: Message;
  unreadCount?: number;
};

export default function PatientMessages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  const filteredConversations = conversations?.filter(conv =>
    conv.psychologist.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="patient">
      <div className="h-[calc(100vh-8rem)]">
        <div className="grid lg:grid-cols-3 h-full gap-6">
          <Card className="border-card-border lg:col-span-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-card-border">
              <h2 className="font-serif text-lg font-semibold mb-4">Mesajlar</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Psikolog ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
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
                      className={`w-full p-4 text-left hover-elevate transition-colors ${
                        selectedConversation === conv.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={conv.psychologist.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {conv.psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">
                              {conv.psychologist.fullName}
                            </p>
                            {conv.unreadCount && conv.unreadCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage.text}
                            </p>
                          )}
                          {conv.lastMessageAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { 
                                addSuffix: true, 
                                locale: tr 
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Sonuç bulunamadı" : "Henüz mesajınız yok"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card className="border-card-border lg:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation && selectedConv ? (
              <>
                <div className="p-4 border-b border-card-border flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConv.psychologist.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {selectedConv.psychologist.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedConv.psychologist.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv.psychologist.title || "Klinik Psikolog"}
                    </p>
                  </div>
                </div>

                {messagesLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <MessageThread
                    messages={messages || []}
                    currentUserId={user?.id || ""}
                    otherUserName={selectedConv.psychologist.fullName || "Psikolog"}
                    otherUserImage={selectedConv.psychologist.profileImageUrl || undefined}
                    onSendMessage={(text) => sendMessageMutation.mutate(text)}
                    isSending={sendMessageMutation.isPending}
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Bir konuşma seçin</h3>
                  <p className="text-sm text-muted-foreground">
                    Mesajlaşmaya başlamak için sol taraftan bir psikolog seçin
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
