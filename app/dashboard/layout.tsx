"use client";

import React, { useEffect, useState, useRef, Suspense, useCallback, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  MessageSquareText,
} from "lucide-react";

import SetUsernameModal from "../Components/SetUsernameModal";
import { Chat, ChatMessage, WebSocketMessagePayload, User } from "../types"; 

import DashboardSidebar from "./components/DashBoardSidebar";

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";
const NOTIFICATION_ICON_URL = "/favicon.ico";
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 1000;

// INTERFACES (Added back)
interface MeApiResponse {
  success: boolean;
  message: string | null;
  user: User | null;
}

interface BackendChatMessage {
    id: string;
    text: string;
    senderType: 'self' | 'anonymous';
    timestamp: string;
    nickname?: string;
}

interface BackendChat {
    id: string;
    senderNickname: string;
    lastMessage: string;
    lastMessageTimestamp: string;
    unreadCount?: number;
    avatarUrl?: string;
    messages: BackendChatMessage[];
}

interface ChatsApiResponse {
  chats: BackendChat[];
  success: boolean;
  message?: string;
}

// CONTEXT
interface DashboardContextType {
  user: User | null;
  chats: Chat[];
  getChatById: (id: string) => Chat | undefined;
  sendMessage: (chatId: string, message: string) => void;
  logout: () => void;
  deleteChat: (chatId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

// HELPER FUNCTION
const fetchUserChatsFromApi = async (token: string): Promise<Chat[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch chats. Status: ${response.status}`);
    }
    const apiResponse: ChatsApiResponse = await response.json();
    if (!apiResponse.success || !Array.isArray(apiResponse.chats)) {
      throw new Error(apiResponse.message || "Received unexpected data format for chats.");
    }
    return apiResponse.chats.map((backendChat: BackendChat): Chat => {
      const transformedMessages = (backendChat.messages || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((msg: BackendChatMessage): ChatMessage => ({
          id: msg.id, text: msg.text,
          sender: msg.senderType === 'self' ? 'self' : (msg.nickname || backendChat.senderNickname),
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalTimestamp: msg.timestamp,
          nickname: msg.senderType === 'anonymous' ? (msg.nickname || backendChat.senderNickname) : undefined,
        }));
      const lastMsgTimestamp = backendChat.lastMessageTimestamp ||
                             (transformedMessages.length > 0 ? transformedMessages[transformedMessages.length - 1].originalTimestamp : new Date(0).toISOString());
      return {
        id: backendChat.id, sender: backendChat.senderNickname,
        messagePreview: backendChat.lastMessage || (transformedMessages.length > 0 ? transformedMessages[transformedMessages.length - 1].text : "No messages yet"),
        messages: transformedMessages, unreadCount: backendChat.unreadCount || 0,
        avatar: backendChat.avatarUrl || `https://i.pravatar.cc/150?u=${backendChat.id}`,
        isAnonymous: true, lastMessageTimestamp: lastMsgTimestamp
      };
    }).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
};

// MAIN LAYOUT COMPONENT
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSetUsernameModalOpen, setIsSetUsernameModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState<string | null>(null);
  const [modalToken, setModalToken] = useState<string | null>(null);
  const [isInitialUserLoadComplete, setIsInitialUserLoadComplete] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [initialChatsFetchAttempted, setInitialChatsFetchAttempted] = useState(false);
  const [isWebSocketConnecting, setIsWebSocketConnecting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = Notification.permission;
      setNotificationPermission(perm);
      if (perm === 'default' && user && user.username) {
        setShowNotificationPrompt(true);
      }
    }
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.load();
  }, [user]);

  const handleLogout = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.close(1000, "User logging out");
    ws.current = null;
    localStorage.removeItem("token");
    setUser(null); setChats([]);
    setIsInitialUserLoadComplete(false);
    router.push("/auth?logged_out=true");
  }, [router]);

  const requestNotificationPermission = useCallback(async () => {
    setShowNotificationPrompt(false);
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification("AnonMsg Notifications Enabled!", { body: "You'll now receive alerts.", icon: NOTIFICATION_ICON_URL });
        }
      }
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    audioRef.current?.play().catch(e => console.warn("Sound play error:", e));
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, chatId: string | number) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, { body, icon: NOTIFICATION_ICON_URL, tag: `anonmsg-chat-${chatId}` });
      notification.onclick = () => {
        window.focus();
        router.push(`/dashboard/${chatId}`);
        notification.close();
      };
    }
  }, [notificationPermission, router]);

  const latestPlayNotificationSoundRef = useRef(playNotificationSound);
  const latestShowBrowserNotificationRef = useRef(showBrowserNotification);
  useEffect(() => { latestPlayNotificationSoundRef.current = playNotificationSound; }, [playNotificationSound]);
  useEffect(() => { latestShowBrowserNotificationRef.current = showBrowserNotification; }, [showBrowserNotification]);

  const connectWebSocket = useCallback((token: string) => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
    setIsWebSocketConnecting(true);
    const socket = new WebSocket(`${WEBSOCKET_BASE_URL}/ws/chat?token=${token}`);
    ws.current = socket;

    socket.onopen = () => {
        setIsWebSocketConnecting(false);
        reconnectAttemptsRef.current = 0;
    };
    socket.onmessage = (event) => {
        const msgPayload: WebSocketMessagePayload = JSON.parse(event.data as string);
        const currentChatId = pathname.split('/').pop();

        if (msgPayload.type === "ANON_TO_USER") {
            const anonSessionId = msgPayload.from;
            if (!anonSessionId) return;
            const newMsgTimestamp = new Date(msgPayload.timestamp || Date.now());
            const newAppMsg: ChatMessage = {
                id: `msg-${newMsgTimestamp.getTime()}`,
                text: msgPayload.content || "",
                sender: msgPayload.nickname || "Anonymous",
                timestamp: newMsgTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                originalTimestamp: newMsgTimestamp.toISOString(),
                nickname: msgPayload.nickname
            };
            setChats(prevChats => {
                let chatExists = false;
                const updatedList = prevChats.map(chat => {
                    if (chat.id === anonSessionId) {
                        chatExists = true;
                        return { ...chat, messages: [...chat.messages, newAppMsg], messagePreview: newAppMsg.text, lastMessageTimestamp: newAppMsg.originalTimestamp, unreadCount: currentChatId === anonSessionId ? 0 : (chat.unreadCount || 0) + 1 };
                    }
                    return chat;
                });
                if (!chatExists) {
                    const newChat: Chat = { id: anonSessionId, sender: newAppMsg.sender, messagePreview: newAppMsg.text, messages: [newAppMsg], unreadCount: 1, avatar: `https://i.pravatar.cc/150?u=${anonSessionId}`, isAnonymous: true, lastMessageTimestamp: newAppMsg.originalTimestamp };
                    updatedList.push(newChat);
                }
                return updatedList.sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
            });
            if (currentChatId !== anonSessionId) {
                latestPlayNotificationSoundRef.current();
                if (document.hidden) latestShowBrowserNotificationRef.current(`New Message from ${newAppMsg.sender}`, newAppMsg.text, anonSessionId);
            } else {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: "MARK_AS_READ", chatId: anonSessionId }));
                }
            }
        }
    };
    socket.onclose = () => {
        setIsWebSocketConnecting(false);
        if (localStorage.getItem("token")) {
            scheduleReconnect();
        }
    };
  }, [pathname]);

  const scheduleReconnect = useCallback(() => {
      const token = localStorage.getItem("token");
      if (!token || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
      setTimeout(() => {
          reconnectAttemptsRef.current++;
          connectWebSocket(token);
      }, Math.min(1000 * (2 ** reconnectAttemptsRef.current), 30000));
  }, [connectWebSocket]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { handleLogout(); return; }
    if (isInitialUserLoadComplete) return;

    setIsLoadingUser(true);
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject("Session invalid"))
      .then((apiRes: MeApiResponse) => {
        if (!apiRes.success || !apiRes.user) throw new Error(apiRes.message || "Invalid user data");
        setUser({ ...apiRes.user, chatLink: apiRes.user.username ? `${window.location.origin}/chat/${apiRes.user.username}` : '' });
        if (!apiRes.user.username) setIsSetUsernameModalOpen(true);
        else setIsInitialUserLoadComplete(true);
      })
      .catch(() => handleLogout())
      .finally(() => setIsLoadingUser(false));
  }, [isInitialUserLoadComplete, handleLogout]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isInitialUserLoadComplete && user?.username && token) {
        if (!initialChatsFetchAttempted) {
            setIsLoadingChats(true);
            setInitialChatsFetchAttempted(true);
            fetchUserChatsFromApi(token).then(setChats).catch(err => setUserError(err.message)).finally(() => setIsLoadingChats(false));
        }
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
            connectWebSocket(token);
        }
    }
    return () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close();
        }
    }
  }, [isInitialUserLoadComplete, user, initialChatsFetchAttempted, connectWebSocket]);

  const handleSendMessage = useCallback((chatId: string, message: string) => {
    if (!message.trim() || !user?.username || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    const msgPayload: WebSocketMessagePayload = { type: "USER_TO_ANON", from: user.username, to: chatId, content: message.trim(), timestamp: new Date().toISOString() };
    ws.current.send(JSON.stringify(msgPayload));
    
    const optimisticMsg: ChatMessage = { id: `optimistic-${Date.now()}`, text: message.trim(), sender: 'self', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), originalTimestamp: msgPayload.timestamp! };
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, optimisticMsg], messagePreview: message.trim(), lastMessageTimestamp: optimisticMsg.originalTimestamp } : c).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()));
  }, [user, ws]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
        setUserError("Authentication error.");
        return;
    }
    setChats(prev => prev.filter(c => c.id !== chatId));
    try {
        const res = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to delete on server.");
    } catch (e) {
        setUserError("Failed to delete chat. Please refresh.");
        // Re-fetch chats to revert optimistic update
        if (token) fetchUserChatsFromApi(token).then(setChats);
    }
  }, []);

  const handleUsernameSet = (newUsername: string) => {
    setUser(u => u ? {...u, username: newUsername, chatLink: `${window.location.origin}/chat/${newUsername}`} : null);
    setIsSetUsernameModalOpen(false);
    setIsInitialUserLoadComplete(true);
  };

  const contextValue: DashboardContextType = {
    user, chats,
    getChatById: (id: string) => chats.find(chat => chat.id.toString() === id),
    sendMessage: handleSendMessage,
    logout: handleLogout,
    deleteChat: handleDeleteChat,
  };

  if (isLoadingUser || (isInitialUserLoadComplete && isLoadingChats)) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (isSetUsernameModalOpen) {
    return <SetUsernameModal isOpen={true} onClose={handleLogout} onUsernameSet={handleUsernameSet} email={user?.email || null} currentUsername={user?.username} token={localStorage.getItem("token")} />;
  }

  const showChatViewOnMobile = !!params.chatId;

  return (
    <DashboardContext.Provider value={contextValue}>
        <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">
            <div className={`${showChatViewOnMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96`}>
                <DashboardSidebar user={user} onLogout={handleLogout} onRequestNotificationPermission={requestNotificationPermission} notificationPermission={notificationPermission} showNotificationPrompt={showNotificationPrompt} onCloseNotificationPrompt={() => setShowNotificationPrompt(false)} copiedLink={copiedLink} onCopyLink={() => {if (user?.chatLink) {navigator.clipboard.writeText(user.chatLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);}}} isLoadingChats={isLoadingChats} initialChatsFetchAttempted={initialChatsFetchAttempted} chats={chats} selectedChatId={params.chatId as string | undefined} onChatSelect={(chat) => router.push(`/dashboard/${chat.id}`)} userError={userError} />
            </div>
            <main className={`${showChatViewOnMobile ? 'flex' : 'hidden'} md:flex flex-grow flex-col relative overflow-hidden bg-white h-full`}>
                {children}
            </main>
        </div>
    </DashboardContext.Provider>
  );
}

export default function DashboardLayoutWrapper(props: { children: React.ReactNode }) {
    return (
      <Suspense fallback={
          <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
              <p className="text-gray-600 text-lg">Loading Dashboard...</p>
          </div>
      }>
        <DashboardLayout {...props} />
      </Suspense>
    );
}