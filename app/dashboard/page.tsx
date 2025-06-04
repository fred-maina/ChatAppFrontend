// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  MessageSquareText,
} from "lucide-react";

import Modal from "../Components/Modal";
import SetUsernameModal from "../Components/SetUsernameModal";
import { Chat, ChatMessage, WebSocketMessagePayload, User } from "../types"; 

import DashboardSidebar from "./components/DashBoardSidebar";
import ChatArea from "./components/ChatArea";

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";
const NOTIFICATION_ICON_URL = "/favicon.ico";
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 1000;

interface MeApiResponse {
  success: boolean;
  message: string | null;
  user: User | null;
  token?: string;
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
    const transformedMessages = backendChat.messages
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


function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalContent, setChatModalContent] = useState<{
    title: string; confirmText: string; action: 'delete' | 'close_chat' | 'logout' | null;
    bodyText?: string; isDestructive?: boolean;
  }>({ title: '', confirmText: '', action: null, bodyText: '', isDestructive: false });
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isWebSocketConnecting, setIsWebSocketConnecting] = useState(false);


  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [initialChatsFetchAttempted, setInitialChatsFetchAttempted] = useState(false);

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
    setUser(null); setChats([]); setSelectedChat(null);
    setInitialChatsFetchAttempted(false); setIsInitialUserLoadComplete(false);
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
          setUserError(null);
        } else {
          setUserError("Notification permission denied.");
        }
      } else if (Notification.permission === 'denied') {
        setUserError("Notifications blocked. Enable in browser settings.");
      } else if (Notification.permission === 'granted') {
        new Notification("AnonMsg Notifications", { body: "Alerts active.", icon: NOTIFICATION_ICON_URL, silent: true });
        setUserError(null);
      }
    } else {
      setUserError("Browser doesn't support notifications.");
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
         // Re-select the chat when notification is clicked
        const chatToSelect = chats.find(c => c.id.toString() === chatId.toString());
        if (chatToSelect) {
             // Directly call the selection logic here or a refined handleChatSelect
            setSelectedChat({ ...chatToSelect, unreadCount: 0 });
            setChats(prev => prev.map(c => c.id === chatToSelect.id ? { ...c, unreadCount: 0 } : c)
                                 .sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()));
            if (searchParams.get('chatId') !== chatToSelect.id.toString()) {
                router.push(`/dashboard?chatId=${chatToSelect.id}`, { scroll: false });
            }
            if ((chatToSelect.unreadCount || 0) > 0 && ws.current?.readyState === WebSocket.OPEN) {
                try {
                    ws.current.send(JSON.stringify({ type: "MARK_AS_READ", chatId: chatToSelect.id } as WebSocketMessagePayload));
                } catch (e) { console.error("Failed to send MARK_AS_READ on notification click", e); }
            }
        }
        notification.close();
      };
    }
  }, [notificationPermission, router, searchParams, chats, ws ]); // Added chats and ws


  const latestPlayNotificationSoundRef = useRef(playNotificationSound);
  const latestShowBrowserNotificationRef = useRef(showBrowserNotification);
  useEffect(() => { latestPlayNotificationSoundRef.current = playNotificationSound; }, [playNotificationSound]);
  useEffect(() => { latestShowBrowserNotificationRef.current = showBrowserNotification; }, [showBrowserNotification]);
  
  // Called when a user clicks a chat in the sidebar
  const handleChatSelect = useCallback((chat: Chat) => {
      setSelectedChat({ ...chat, unreadCount: 0 });
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c)
                           .sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()));

      if (searchParams.get('chatId') !== chat.id.toString()) {
          router.push(`/dashboard?chatId=${chat.id}`, { scroll: false });
      }

      if ((chat.unreadCount || 0) > 0 && ws.current?.readyState === WebSocket.OPEN) {
          try {
              ws.current.send(JSON.stringify({ type: "MARK_AS_READ", chatId: chat.id } as WebSocketMessagePayload));
          } catch (e) { console.error("Failed to send MARK_AS_READ on user select", e); }
      }
  }, [router, searchParams, ws]);

  // Effect to synchronize selectedChat state with URL's chatId parameter
  useEffect(() => {
      const chatIdFromUrl = searchParams.get('chatId');

      if (!isInitialUserLoadComplete || !user?.username) {
          return; // Not ready yet
      }

      if (!chatIdFromUrl) { // No chatId in URL (e.g., /dashboard)
          if (selectedChat !== null) {
              setSelectedChat(null); // Clear selected chat if URL doesn't specify one
          }
          return;
      }

      // chatId is in URL. Check if current state matches.
      if (selectedChat?.id?.toString() === chatIdFromUrl) {
          // Already in sync, or was just set by handleChatSelect which also updated URL.
          // Verify the chat still exists in the chats list, in case chats updated.
          const chatExists = chats.find(c => c.id.toString() === chatIdFromUrl);
          if (!chatExists && (initialChatsFetchAttempted && !isLoadingChats)) {
             setSelectedChat(null); // Chat disappeared from list, deselect.
             // router.push('/dashboard', { scroll: false }); // Optionally navigate away from invalid chat URL
          }
          return;
      }
      
      // State needs to be updated based on URL
      if (chats.length > 0 || initialChatsFetchAttempted) {
          const chatToSelect = chats.find(c => c.id.toString() === chatIdFromUrl);
          if (chatToSelect) {
              setSelectedChat({ ...chatToSelect, unreadCount: 0 });
              setChats(prev => prev.map(c => c.id === chatToSelect.id ? { ...c, unreadCount: 0 } : c)
                                   .sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()));
              if ((chatToSelect.unreadCount || 0) > 0 && ws.current?.readyState === WebSocket.OPEN) {
                  try {
                      ws.current.send(JSON.stringify({ type: "MARK_AS_READ", chatId: chatToSelect.id } as WebSocketMessagePayload));
                  } catch (e) { console.error("Failed to send MARK_AS_READ on URL sync", e); }
              }
          } else {
              // Chat ID in URL not found in current chats list
              if (initialChatsFetchAttempted && !isLoadingChats) {
                  setSelectedChat(null); // Clear selection for invalid chatId
                  // Consider if navigating to /dashboard is desired if URL has an invalid chatId
                  // For now, just clearing selection will make ChatArea show its placeholder.
                  // router.push('/dashboard', { scroll: false });
              }
          }
      }
  }, [searchParams, chats, isInitialUserLoadComplete, user, initialChatsFetchAttempted, isLoadingChats, selectedChat, ws, router]);


  const scheduleReconnect = useCallback((token: string) => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setUserError("Max reconnect attempts. Refresh or check connection.");
      return;
    }
    const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (user?.username && token && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
        connectWebSocket(token, true);
      }
    }, delay);
  }, [user?.username]); // connectWebSocket will be memoized separately or defined in scope

  const connectWebSocket = useCallback((token: string, isReconnect: boolean = false) => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
    if (!token) {
      setUserError("Auth token missing for chat.");
      if (!isReconnect) router.push("/auth?error=ws_token_missing");
      return;
    }
    if (!user?.username) {
      if (!isReconnect) setUserError("User profile not loaded for chat.");
      return;
    }
    
    setIsWebSocketConnecting(true);
    if (userError?.includes('reconnect') || userError?.includes('lost') || userError?.includes('Chat connection error')) {
        setUserError(null);
    }

    const socket = new WebSocket(`${WEBSOCKET_BASE_URL}/ws/chat?token=${token}`);
    ws.current = socket;

    socket.onopen = () => {
      setIsWebSocketConnecting(false);
      setUserError(null); 
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    socket.onmessage = (event) => {
      const msgPayload: WebSocketMessagePayload = JSON.parse(event.data as string);
      if (msgPayload.type === "ANON_TO_USER") {
        const anonSessionId = msgPayload.from; 
        const nickname = msgPayload.nickname || "Anonymous";
        const newMsgTimestamp = msgPayload.timestamp ? new Date(msgPayload.timestamp) : new Date();
        const newAppMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`, text: msgPayload.content || "", sender: nickname,
          timestamp: newMsgTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalTimestamp: newMsgTimestamp.toISOString(), nickname
        };
        
        setChats(prevChats => {
            let chatExists = false;
            const updatedChatsList = prevChats.map(chat => {
              if (chat.id === anonSessionId) {
                chatExists = true;
                return { 
                    ...chat, 
                    messages: [...chat.messages, newAppMsg].sort((a,b)=>new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
                    messagePreview: newAppMsg.text, 
                    unreadCount: (selectedChat?.id === anonSessionId) ? 0 : (chat.unreadCount || 0) + 1,
                    lastMessageTimestamp: newMsgTimestamp.toISOString() 
                };
              }
              return chat;
            });
            if (chatExists) {
                return updatedChatsList.sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
            } else {
              const newChatEntry: Chat = {
                id: anonSessionId || `new-${Date.now()}`, 
                sender: nickname, 
                messagePreview: newAppMsg.text, 
                messages: [newAppMsg],
                avatar: `https://i.pravatar.cc/150?u=${anonSessionId}`, 
                isAnonymous: true,
                unreadCount: (selectedChat?.id === anonSessionId) ? 0 : 1, 
                lastMessageTimestamp: newMsgTimestamp.toISOString()
              };
              return [newChatEntry, ...prevChats].sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
            }
        });

        setSelectedChat(currentSel => {
          if (currentSel && currentSel.id === anonSessionId) {
            if (ws.current?.readyState === WebSocket.OPEN) {
              try { ws.current.send(JSON.stringify({ type: "MARK_AS_READ", chatId: anonSessionId } as WebSocketMessagePayload)); }
              catch (e) { console.error("Failed to send MARK_AS_READ", e); }
            }
            return {
                ...currentSel,
                messages: [...(currentSel.messages || []), newAppMsg].sort((a,b)=>new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
                lastMessageTimestamp: newMsgTimestamp.toISOString(), 
                unreadCount: 0, 
            };
          } else {
            if (currentSel?.id !== anonSessionId) { 
                 latestPlayNotificationSoundRef.current();
                 if (document.hidden) {
                    latestShowBrowserNotificationRef.current(
                        `New Message from ${nickname}`,
                        newAppMsg.text,
                        anonSessionId || ""
                    );
                 }
            }
          }
          return currentSel; 
        });

      } else if (msgPayload.type === "ERROR") {
          setUserError(`Chat error: ${msgPayload.content}`);
      }
    };
    socket.onerror = () => {
      setIsWebSocketConnecting(false);
      ws.current = null; 
      setUserError('Chat connection error. Attempting to reconnect...');
      scheduleReconnect(token);
    };
    socket.onclose = (ev) => {
      setIsWebSocketConnecting(false);
      ws.current = null; 
      if (!ev.wasClean && ev.code !== 1000 && user?.username) { 
        setUserError('Chat connection lost. Attempting to reconnect.');
        scheduleReconnect(token);
      }
    };
  }, [user?.username, router, scheduleReconnect, latestPlayNotificationSoundRef, latestShowBrowserNotificationRef, selectedChat?.id]); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    const action = searchParams.get("action");
    const emailQuery = searchParams.get("email");
    const tempTokenQuery = searchParams.get("tempToken");

    if (action === "setUsername" && emailQuery && tempTokenQuery && !isSetUsernameModalOpen) {
      setModalEmail(emailQuery); setModalToken(tempTokenQuery);
      setIsLoadingUser(false); setIsSetUsernameModalOpen(true);
      return;
    }
    if (!token && !isSetUsernameModalOpen) { router.push("/auth?error=no_token"); return; }
    if (isInitialUserLoadComplete) { setIsLoadingUser(false); return; }

    setIsLoadingUser(true);
    fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { handleLogout(); return Promise.reject(new Error("Session expired"));}
          const errData = await res.json().catch(() => ({message: "Unknown server error"}));
          return Promise.reject(new Error(errData.message || `Server error: ${res.status}`));
        }
        return res.json();
      })
      .then((apiRes: MeApiResponse) => {
        if (!apiRes.success || !apiRes.user?.id) {
          handleLogout(); 
          throw new Error(apiRes.message || "Invalid user data.");
        }
        const fetchedUser = apiRes.user;
        setUser({ ...fetchedUser, chatLink: fetchedUser.username ? `${window.location.origin}/chat/${fetchedUser.username}` : '' });
        if (fetchedUser.username === null) {
          setModalEmail(fetchedUser.email || null); setModalToken(token);
          setIsSetUsernameModalOpen(true);
        } else {
          setIsInitialUserLoadComplete(true);
          if (typeof window !== "undefined" && Notification.permission === 'default') setShowNotificationPrompt(true);
        }
      })
      .catch(err => {
        setUserError((err as Error).message || "Failed to load dashboard. Try login again.");
      })
      .finally(() => setIsLoadingUser(false));
    return () => { 
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.close(1000, "Dashboard unmounting");
      ws.current = null;
    };
  }, [searchParams, isSetUsernameModalOpen, isInitialUserLoadComplete, router, handleLogout]); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isInitialUserLoadComplete && user?.username && token) {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
         if(!isWebSocketConnecting && reconnectAttemptsRef.current === 0) connectWebSocket(token);
      }
      if (!initialChatsFetchAttempted) {
        setInitialChatsFetchAttempted(true); setIsLoadingChats(true);
        fetchUserChatsFromApi(token)
          .then(apiChats => {
            setChats(apiChats);
            // Initial URL sync for chat selection is handled by the dedicated useEffect for searchParams
          })
          .catch(err => setUserError(`Could not load convos: ${(err as Error).message}`))
          .finally(() => setIsLoadingChats(false));
      }
    }
  }, [isInitialUserLoadComplete, user, initialChatsFetchAttempted, connectWebSocket]); 

  useEffect(() => {
    if (selectedChat?.messages?.length) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  const handleCopyLink = () => {
    if (user?.chatLink) {
      navigator.clipboard.writeText(user.chatLink)
        .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); })
        .catch(err => console.error('Copy failed: ', err));
    }
  };

  const handleUsernameSet = (newUsername: string) => {
    setIsSetUsernameModalOpen(false);
    const updatedU = { ...(user || {} as User), username: newUsername, chatLink: `${window.location.origin}/chat/${newUsername}` };
    setUser(updatedU as User);
    router.replace("/dashboard", { scroll: false }); // remove query params from set username action
    if (modalToken && localStorage.getItem("token") !== modalToken) localStorage.setItem("token", modalToken);
    setModalToken(null); setModalEmail(null);
    setIsInitialUserLoadComplete(true);
  };

  const handleCloseUsernameModal = () => {
    setIsSetUsernameModalOpen(false);
    router.replace("/dashboard", { scroll: false }); // remove query params
    if (user?.username === null) { // If username was required and modal was cancelled
      setUserError("Username setup is required. Please login again to set your username.");
      setTimeout(handleLogout, 2000);
    }
  };
  
  const sendViaWebSocketInternal = () => {
    if (!newMessage.trim() || !selectedChat || !user?.username) {
        setIsSendingMessage(false); return;
    }
    const currentMsgTimestamp = new Date();
    const msgPayload: WebSocketMessagePayload = {
      type: "USER_TO_ANON", from: user.username, to: selectedChat.id.toString(),
      content: newMessage.trim(), timestamp: currentMsgTimestamp.toISOString(),
    };
    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}-${Math.random()}`, text: newMessage.trim(), sender: 'self',
      timestamp: currentMsgTimestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
      originalTimestamp: currentMsgTimestamp.toISOString(),
    };
    const selChatId = selectedChat.id;

    setChats(prev => prev.map(c => c.id === selChatId ? { ...c, 
        messages: [...c.messages, optimisticMsg].sort((a,b)=>new Date(a.originalTimestamp).getTime()-new Date(b.originalTimestamp).getTime()),
        messagePreview: newMessage.trim(), lastMessageTimestamp: currentMsgTimestamp.toISOString() } : c)
       .sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()));
    setSelectedChat(prevSel => prevSel ? { ...prevSel, 
        messages: [...prevSel.messages, optimisticMsg].sort((a,b)=>new Date(a.originalTimestamp).getTime()-new Date(b.originalTimestamp).getTime()),
        lastMessageTimestamp: currentMsgTimestamp.toISOString() } : null);
    
    const currentMsgText = newMessage;
    setNewMessage('');

    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(msgPayload)); 
        setUserError(null); 
      } else {
          throw new Error("WebSocket not open. Message conceptually queued.");
      }
    } catch (e) {
      console.error("Send message error:", e);
      setUserError("Send failed. Message conceptually saved locally."); 
      setChats(prev => prev.map(c => c.id === selChatId ? { ...c, messages: c.messages.filter(m => m.id !== optimisticMsg.id) } : c));
      setSelectedChat(prevSel => prevSel ? { ...prevSel, messages: prevSel.messages.filter(m => m.id !== optimisticMsg.id) } : null);
      setNewMessage(currentMsgText); 
    } finally { 
        setIsSendingMessage(false); 
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || isSendingMessage) return;
    setIsSendingMessage(true);
    if (ws.current?.readyState === WebSocket.OPEN) {
      sendViaWebSocketInternal();
    } else {
      setUserError("Chat disconnected. Attempting to reconnect and send...");
      const token = localStorage.getItem("token");
      if (token && user?.username) {
        connectWebSocket(token); 
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            sendViaWebSocketInternal();
          } else { 
            setUserError("Send failed. Chat currently unavailable."); 
            setIsSendingMessage(false); 
          }
        }, 2500); 
      } else { 
        setUserError("Cannot send message. Authentication or user details missing."); 
        setIsSendingMessage(false); 
      }
    }
  };
  
  // Called by ChatView's back button
  const handleBackFromChatView = useCallback(() => {
      setSelectedChat(null);
      if (searchParams.get('chatId')) { // Only push if chatId is in URL
          router.push('/dashboard', { scroll: false });
      }
  }, [router, searchParams]);


  const openChatActionModal = (action: 'delete' | 'close_chat' | 'logout') => {
    if (!selectedChat && action !== 'logout') return;
    if (action === 'logout') setChatModalContent({ title: 'Logout?', bodyText: 'Sure you want to logout?', confirmText: 'Logout', action, isDestructive: true });
    else if (selectedChat) {
      if (action === 'delete') setChatModalContent({ title: 'Delete Chat?', bodyText: `Delete chat with ${selectedChat.sender}? Cannot undo.`, confirmText: 'Delete', action, isDestructive: true });
      else if (action === 'close_chat') setChatModalContent({ title: 'Close Chat?', bodyText: `Close chat with ${selectedChat.sender}? Reopen from sidebar.`, confirmText: 'Close', action, isDestructive: false });
    }
    setIsChatModalOpen(true);
  };

  const handleConfirmChatModal = async () => {
    const { action } = chatModalContent;
    setIsChatModalOpen(false);
    if (action === 'logout') { handleLogout(); return; }
    
    if (selectedChat && (action === 'delete' || action === 'close_chat')) {
        if (action === 'delete') {
            const token = localStorage.getItem("token");
            if (!token) { setUserError("Auth token missing for delete."); return; }
            try {
                const res = await fetch(`${API_BASE_URL}/api/chat/${selectedChat.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                  setChats(prev => prev.filter(c => c.id !== selectedChat.id));
                  setSelectedChat(null); 
                  router.push('/dashboard', { scroll: false }); // Navigate to base after delete
                } else {
                  const errData = await res.json().catch(() => ({}));
                  setUserError(errData.message || `Delete failed: ${res.status}`);
                }
            } catch (e) { setUserError(`Delete error: ${(e as Error).message}`); }
        } else if (action === 'close_chat') { 
            setSelectedChat(null); 
            router.push('/dashboard', { scroll: false }); // Navigate to base after close
        }
    }
  };

  // Loading states and error display
  if (isLoadingUser && !isInitialUserLoadComplete && !isSetUsernameModalOpen && !modalToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  const persistentError = userError && !userError.includes('reconnect') && !userError.includes('lost') && !userError.includes('Chat connection error');
  if (persistentError && !isSetUsernameModalOpen) {
    return (
       <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Oops!</h2>
        <p className="text-gray-600 mb-4 px-4">{userError}</p>
        <button onClick={handleLogout} className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600">
            Go to Login
        </button>
      </div>
    );
  }

  if (isSetUsernameModalOpen) {
    return (
      <>
        <SetUsernameModal isOpen={true} onClose={handleCloseUsernameModal} onUsernameSet={handleUsernameSet}
          email={modalEmail || user?.email || null} currentUsername={user?.username} token={modalToken || localStorage.getItem("token")} />
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 filter blur-sm">
          <MessageSquareText className="w-16 h-16 text-teal-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome!</h2>
          <p className="text-gray-600">Set username to continue.</p>
        </div>
      </>
    );
  }
  
  if (!isLoadingUser && (!isInitialUserLoadComplete || !user || !user.username) && !isSetUsernameModalOpen ) {
     if (typeof window !== "undefined" && pathname && !pathname.includes("/auth")) {
        router.push("/auth?error=user_setup_incomplete_final_check");
     }
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mr-3" /> Redirecting...
        </div>
      );
  }

  // Main dashboard structure
  // Conditionally render sidebar and chat area based on selectedChat and screen size (for mobile view)
  const showChatViewOnMobile = selectedChat && searchParams.get('chatId');

  return (
    <>
      <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">
        {/* Sidebar: Always flex on md, conditionally hidden on mobile if a chat is selected */}
        <div className={`${showChatViewOnMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96`}>
            <DashboardSidebar
                user={user}
                onLogout={handleLogout}
                onRequestNotificationPermission={requestNotificationPermission}
                notificationPermission={notificationPermission}
                showNotificationPrompt={showNotificationPrompt}
                onCloseNotificationPrompt={() => setShowNotificationPrompt(false)}
                copiedLink={copiedLink}
                onCopyLink={handleCopyLink}
                isLoadingChats={isLoadingChats}
                initialChatsFetchAttempted={initialChatsFetchAttempted}
                chats={chats}
                selectedChat={selectedChat}
                onChatSelect={handleChatSelect} // This is crucial for chat switching
                userError={userError} 
            />
        </div>
        
        {/* Chat Area: Always flex on md, conditionally shown on mobile if a chat is selected */}
        <main className={`${showChatViewOnMobile ? 'flex' : 'hidden'} md:flex flex-grow flex-col relative overflow-hidden bg-white h-full`}>
            <ChatArea
                selectedChat={selectedChat}
                onSendMessage={handleSendMessage}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                messagesEndRef={messagesEndRef}
                onBackFromChatView={handleBackFromChatView} // Crucial for mobile back
                onOpenChatActionModal={openChatActionModal}
                userError={userError} 
                isLoadingChats={isLoadingChats}
                isWebSocketConnecting={isWebSocketConnecting}
                isWebSocketConnected={!!(ws.current && ws.current.readyState === WebSocket.OPEN)}
            />
        </main>
      </div>
      <Modal isOpen={isChatModalOpen} onClose={() => setIsChatModalOpen(false)} onConfirm={handleConfirmChatModal} title={chatModalContent.title} confirmButtonText={chatModalContent.confirmText} isDestructive={chatModalContent.isDestructive ?? false}>
        {chatModalContent.bodyText && <p className="text-gray-600 text-sm">{chatModalContent.bodyText}</p>}
      </Modal>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Loading Dashboard...</p>
        </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}