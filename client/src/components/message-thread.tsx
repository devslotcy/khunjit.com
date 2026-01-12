import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, Flag, Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";
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
  onSendMessage: (text: string) => void;
  onReportMessage?: (messageId: string, reason: string) => void;
  isSending?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  otherUserName,
  otherUserImage,
  onSendMessage,
  onReportMessage,
  isSending
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
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
    return format(date, "d MMM HH:mm", { locale: tr });
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
    return format(date, "d MMMM yyyy", { locale: tr });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6">
          {groupMessagesByDate().map((group) => (
            <div key={group.date} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {formatDateHeader(group.date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {group.messages.map((message) => {
                const isOwn = message.senderUserId === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isOwn && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={otherUserImage} />
                        <AvatarFallback>
                          {otherUserName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`max-w-md group relative ${isOwn ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </div>
                      
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                        <span className="text-xs text-muted-foreground">
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

                      {!isOwn && onReportMessage && (
                        <div className="absolute -right-8 top-0 invisible group-hover:visible">
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
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesajınızı yazın..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            data-testid="input-message"
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
