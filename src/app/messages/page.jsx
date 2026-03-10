"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  createConversation, 
  sendMessage, 
  getUserConversations, 
  getConversationMessages,
  markMessagesAsRead 
} from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  ShoppingBag,
  User,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function MessagesPage() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadConversations();
  }, [user, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && user) {
      loadMessages(selectedConversation.id);
      // Mark messages as read
      markMessagesAsRead(selectedConversation.id, user.uid);
    }
  }, [selectedConversation, user]);

  async function loadConversations() {
    if (!user) return;
    setLoading(true);
    try {
      const convs = await getUserConversations(user.uid);
      setConversations(convs);
    } catch (e) {
      console.error("Error loading conversations:", e);
    }
    setLoading(false);
  }

  async function loadMessages(conversationId) {
    try {
      const msgs = await getConversationMessages(conversationId);
      setMessages(msgs);
    } catch (e) {
      console.error("Error loading messages:", e);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      await sendMessage(selectedConversation.id, user.uid, newMessage.trim());
      setNewMessage("");
      await loadMessages(selectedConversation.id);
      await loadConversations(); // Refresh conversation list
    } catch (e) {
      console.error("Error sending message:", e);
    }
    setSending(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    } else {
      return date.toLocaleDateString("fr-HT", { day: "numeric", month: "short" });
    }
  }

  function getOtherParticipant(conversation) {
    const otherId = conversation.participants.find(id => id !== user.uid);
    return otherId;
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">{t("loginToSeeMessages")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("loginToSeeMessagesDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 rounded-2xl border bg-white shadow-sm">
      {/* Conversations List */}
      <div className="w-full max-w-sm border-r">
        <div className="border-b p-4">
          <h1 className="font-display text-xl font-semibold">{t("messages")}</h1>
          <p className="text-sm text-slate-500">
            {conversations.length} {t("conversation")}{conversations.length > 1 ? "s" : ""}
          </p>
        </div>
        
        <div className="overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-400">{t("loadingConversations")}</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t("noMessages")}</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherId = getOtherParticipant(conv);
              const unreadCount = conv.unreadCount?.[user.uid] || 0;
              const isItemRelated = conv.itemInfo;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex cursor-pointer gap-3 border-b p-4 transition-colors hover:bg-slate-50 ${
                    selectedConversation?.id === conv.id ? "bg-rose-50" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                      {getInitials(conv.participantNames?.[otherId] || "U")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-medium">
                        {conv.participantNames?.[otherId] || t("user")}
                      </h3>
                      {unreadCount > 0 && (
                        <Badge className="h-5 w-5 rounded-full bg-[#9B2335] p-0 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mt-1 flex items-center gap-2">
                      {isItemRelated && (
                        <ShoppingBag className="h-3 w-3 text-slate-400" />
                      )}
                      <p className="truncate text-sm text-slate-500">
                        {conv.lastMessage || t("startConversation")}
                      </p>
                    </div>
                    
                    <p className="mt-1 text-xs text-slate-400">
                      {conv.lastMessageTime ? formatDate(conv.lastMessageTime) : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl lg:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                    {getInitials(
                      selectedConversation.participantNames?.[getOtherParticipant(selectedConversation)] || "U"
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h2 className="font-medium">
                    {selectedConversation.participantNames?.[getOtherParticipant(selectedConversation)] || t("user")}
                  </h2>
                  {selectedConversation.itemInfo && (
                    <p className="text-sm text-slate-500">
                      {selectedConversation.itemInfo.title}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">
                      {t("noMessagesInChat")}. {t("sendFirstMessage")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === user.uid;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs rounded-2xl px-4 py-2 lg:max-w-md ${
                            isMe
                              ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`mt-1 flex items-center gap-1 text-xs ${
                            isMe ? "text-rose-100" : "text-slate-400"
                          }`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {isMe && (
                              message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder={t("typeMessage")}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-xl"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-2 font-medium">{t("selectConversation")}</h3>
              <p className="text-sm text-slate-500">
                {t("selectConversationDesc")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
