import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, Flag, Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Message } from "@shared/schema";

interface MessageWithSender extends Message {
  senderName?: string;
  senderImage?: string;
}

interface MessageThreadProps {
  messages: MessageWithSender[];
  currentUserId: string;
  otherUserName: string;
  otherUserImage?: string;
  otherUserId?: string; // Added to check if conversation is with system
  onSendMessage: (text: string) => void;
  onReportMessage?: (messageId: string, reason: string) => void;
  isSending?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  otherUserName,
  otherUserImage,
  otherUserId,
  onSendMessage,
  onReportMessage,
  isSending
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this is a system conversation (cannot reply)
  const isSystemConversation = otherUserId === 'system';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && !isSending) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    if (isYesterday(date)) {
      return `Dün ${format(date, "HH:mm")}`;
    }
    return format(date, "d MMM HH:mm", { locale: enUS });
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: MessageWithSender[] }[] = [];

    messages.forEach(message => {
      const dateKey = format(new Date(message.createdAt!), "yyyy-MM-dd");
      const existingGroup = groups.find(g => g.date === dateKey);

      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: dateKey, messages: [message] });
      }
    });

    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Bugün";
    if (isYesterday(date)) return "Dün";
    return format(date, "d MMMM yyyy", { locale: enUS });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages container with native scroll */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4"
      >
        <div className="space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-sm text-muted-foreground">
                Henüz mesaj yok. İlk mesajı gönderin!
              </p>
            </div>
          ) : (
            groupMessagesByDate().map((group) => (
              <div key={group.date} className="space-y-3 sm:space-y-4">
                {/* Date separator */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">
                    {formatDateHeader(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages */}
                {group.messages.map((message) => {
                  const isOwn = message.senderUserId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${message.id}`}
                    >
                      {/* Avatar for other user's messages */}
                      {!isOwn && (
                        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                          <AvatarImage src={otherUserImage} />
                          <AvatarFallback className="text-xs">
                            {otherUserName?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Message bubble */}
                      <div className={`max-w-[75%] sm:max-w-[70%] md:max-w-md group relative ${isOwn ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-3 py-2 sm:px-4 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                        </div>

                        {/* Timestamp and read status */}
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatMessageDate(new Date(message.createdAt!))}
                          </span>
                          {isOwn && (
                            <span className="text-muted-foreground">
                              {message.readAt ? (
                                <CheckCheck className="w-3 h-3 text-primary" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Report menu (hidden on mobile, visible on hover for desktop) */}
                        {!isOwn && onReportMessage && (
                          <div className="absolute -right-8 top-0 hidden sm:invisible sm:group-hover:visible sm:block">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onReportMessage(message.id, "inappropriate")}
                                  className="text-destructive"
                                >
                                  <Flag className="w-4 h-4 mr-2" />
                                  Şikayet Et
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input - hidden for system conversations */}
      {!isSystemConversation && (
        <div className="border-t border-border p-3 sm:p-4 bg-card">
          <div className="flex items-end gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın..."
              className="min-h-[40px] sm:min-h-[44px] max-h-24 sm:max-h-32 resize-none text-sm"
              rows={1}
              data-testid="input-message"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      {isSystemConversation && (
        <div className="border-t border-border p-3 sm:p-4 bg-card text-center">
          <p className="text-sm text-muted-foreground">
            Bu bir sistem mesajıdır. Yanıt veremezsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
