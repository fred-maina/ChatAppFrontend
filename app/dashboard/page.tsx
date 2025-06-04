// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogOut,
  MessageSquareText,
  Copy,
  AlertTriangle,
  Loader2,
  BellDot,
  Link2Icon
} from "lucide-react";

import SidebarContent from "../Components/SidebarContent";
import ChatView from "../Components/ChatView";
import Modal from "../Components/Modal";
import SetUsernameModal from "../Components/SetUsernameModal";
import { Chat, ChatMessage, WebSocketMessagePayload } from "../types";


const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";
const NOTIFICATION_ICON_URL = "/favicon.ico";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string | null;
  role?: string;
  verified?: boolean;
  chatLink?: string;
}

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
  console.log("Attempting to fetch initial chats with token:", token ? "Token Present" : "Token Missing");

  const response = await fetch(`${API_BASE_URL}/api/chats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch chats. Status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      console.log(e); 
    }
    console.error("API Error fetching chats (response not ok):", response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const apiResponse: ChatsApiResponse = await response.json();

  if (!apiResponse.success) {
    console.error("API Error: Operation not successful.", apiResponse.message || "No specific message from API.");
    throw new Error(apiResponse.message || "API reported that fetching chats was not successful.");
  }

  if (!Array.isArray(apiResponse.chats)) {
    console.error("API Error: 'chats' field is not an array or is missing.", apiResponse);
    throw new Error("Received unexpected data format from server (expected 'chats' array).");
  }

  const backendChats: BackendChat[] = apiResponse.chats;

  return backendChats.map((backendChat: BackendChat): Chat => {
    const transformedMessages = backendChat.messages
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((msg: BackendChatMessage): ChatMessage => ({
        id: msg.id,
        text: msg.text,
        sender: msg.senderType === 'self' ? 'self' : (msg.nickname || backendChat.senderNickname),
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalTimestamp: msg.timestamp,
        nickname: msg.senderType === 'anonymous' ? (msg.nickname || backendChat.senderNickname) : undefined,
      }));

    const lastMsgTimestamp = backendChat.lastMessageTimestamp ||
                           (transformedMessages.length > 0 ? transformedMessages[transformedMessages.length - 1].originalTimestamp : new Date(0).toISOString());

    return {
      id: backendChat.id,
      sender: backendChat.senderNickname,
      messagePreview: backendChat.lastMessage || (transformedMessages.length > 0 ? transformedMessages[transformedMessages.length - 1].text : "No messages yet"),
      messages: transformedMessages,
      unreadCount: backendChat.unreadCount || 0,
      avatar: backendChat.avatarUrl || `https://i.pravatar.cc/150?u=${backendChat.id}`,
      isAnonymous: true,
      lastMessageTimestamp: lastMsgTimestamp
    };
  }).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
};


function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalContent, setChatModalContent] = useState<{
    title: string;
    confirmText: string;
    action: 'delete' | 'close_chat' | 'logout' | null;
    bodyText?: string;
    isDestructive?: boolean;
  }>({ title: '', confirmText: '', action: null, bodyText: '', isDestructive: false });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const [initialChatsFetchAttempted, setInitialChatsFetchAttempted] = useState(false);


  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.load();
  }, []);

  const handleLogout = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, "User logging out");
    }
    ws.current = null;
    localStorage.removeItem("token");
    setUser(null); setChats([]); setSelectedChat(null);
    setInitialChatsFetchAttempted(false);
    setIsInitialUserLoadComplete(false); 
    router.push("/auth?logged_out=true");
  }, [router]); 

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification("AnonMsg Notifications Enabled!", {
            body: "You'll now receive alerts for new messages.",
            icon: NOTIFICATION_ICON_URL
          });
        } else {
             setUserError("Notification permission denied. You won't receive desktop alerts.");
        }
      } else if (Notification.permission === 'denied') {
         setUserError("Notifications are blocked. Please enable them in your browser settings.");
      } else if (Notification.permission === 'granted') {
        new Notification("AnonMsg Notifications", {
            body: "Desktop alerts for new messages are active.",
            icon: NOTIFICATION_ICON_URL,
            silent: true
        });
      }
    } else {
      setUserError("This browser does not support desktop notifications.");
    }
  }, []);

  const handleChatSelect = useCallback((chat: Chat) => {
    router.push(`/dashboard?chatId=${chat.id}`, { scroll: false });

    const currentUnreadCount = chat.unreadCount || 0;

    setChats(prevChats =>
        prevChats.map(c =>
            c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime())
    );

    setSelectedChat({ ...chat, unreadCount: 0 });

    if (currentUnreadCount > 0 && ws.current && ws.current.readyState === WebSocket.OPEN) {
        const markAsReadMessage: WebSocketMessagePayload = {
            type: "MARK_AS_READ",
            chatId: chat.id,
        };
        try {
            ws.current.send(JSON.stringify(markAsReadMessage));
            console.log("Sent MARK_AS_READ when selecting chat:", chat.id);
        } catch (error) {
            console.error("Failed to send MARK_AS_READ message when selecting chat:", error);
        }
    }
  }, [router]); 

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.warn("Error playing notification sound:", error));
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, chatId: string | number) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: NOTIFICATION_ICON_URL,
        tag: `anonmsg-chat-${chatId}`
      });

      notification.onclick = () => {
        window.focus();
        const chatToSelect = chats.find(c => c.id === chatId);
        if (chatToSelect) {
          handleChatSelect(chatToSelect); 
        }
        notification.close();
      };
    }
  }, [notificationPermission, chats, handleChatSelect]);

  const latestPlayNotificationSoundRef = useRef(playNotificationSound);
  const latestShowBrowserNotificationRef = useRef(showBrowserNotification);

  useEffect(() => {
    latestPlayNotificationSoundRef.current = playNotificationSound;
  }, [playNotificationSound]);

  useEffect(() => {
    latestShowBrowserNotificationRef.current = showBrowserNotification;
  }, [showBrowserNotification]);


  const connectWebSocket = useCallback((token: string) => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket already connected or connecting.");
        return;
    }
    if (!token) {
        console.error("No token available for WebSocket connection.");
        setUserError("Authentication token missing, cannot connect to chat server.");
        if (typeof window !== "undefined") router.push("/auth?error=ws_token_missing");
        return;
    }
     if (!user?.username) { 
        console.error("Username not available for WebSocket connection. User:", user);
        return;
    }

    const socketUrl = `${WEBSOCKET_BASE_URL}/ws/chat?token=${token}`;
    console.log("Connecting to WebSocket:", socketUrl);
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log("Authenticated WebSocket connection established");
      setUserError(null);
    };

    socket.onmessage = (event) => {
        try {
            const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string);
            console.log("Dashboard received message:", messagePayload);

            if (messagePayload.type === "ANON_TO_USER") {
                const anonSessionId = messagePayload.from; 
                const nickname = messagePayload.nickname || "Anonymous";
                const newMessageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date();

                const newAppMessage: ChatMessage = {
                    id: `msg-${Date.now()}-${Math.random()}`,
                    text: messagePayload.content || "",
                    sender: nickname,
                    timestamp: newMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    originalTimestamp: newMessageTimestamp.toISOString(),
                    nickname: nickname,
                };
                
                setSelectedChat(currentSelectedChat => {
                    const isForCurrentlySelectedChat = currentSelectedChat && currentSelectedChat.id === anonSessionId;

                    setChats(prevChats => {
                        let chatExists = false;
                        const updatedChats = prevChats.map(chat => {
                            if (chat.id === anonSessionId) {
                                chatExists = true;
                                return {
                                    ...chat,
                                    messages: [...chat.messages, newAppMessage]
                                        .sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
                                    messagePreview: newAppMessage.text,
                                    unreadCount: isForCurrentlySelectedChat ? 0 : (chat.unreadCount || 0) + 1,
                                    lastMessageTimestamp: newMessageTimestamp.toISOString(),
                                };
                            }
                            return chat;
                        });

                        if (chatExists) {
                            return updatedChats.sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
                        } else {
                            const newChat: Chat = {
                                id: anonSessionId || `new-${Date.now()}`, 
                                sender: nickname,
                                messagePreview: newAppMessage.text,
                                messages: [newAppMessage],
                                avatar: `https://i.pravatar.cc/150?u=${anonSessionId}`,
                                isAnonymous: true,
                                unreadCount: isForCurrentlySelectedChat ? 0 : 1,
                                lastMessageTimestamp: newMessageTimestamp.toISOString(),
                            };
                            return [newChat, ...prevChats].sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
                        }
                    });

                    if (isForCurrentlySelectedChat) {
                        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                            const markAsReadMessage: WebSocketMessagePayload = {
                                type: "MARK_AS_READ",
                                chatId: anonSessionId,
                            };
                            try {
                                ws.current.send(JSON.stringify(markAsReadMessage));
                                console.log("Sent MARK_AS_READ for incoming message in open chat:", anonSessionId);
                            } catch (error) {
                                console.error("Failed to send MARK_AS_READ for open chat:", error);
                            }
                        }
                         return { 
                            ...currentSelectedChat,
                            messages: [...(currentSelectedChat?.messages || []), newAppMessage]
                                 .sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
                            messagePreview: newAppMessage.text,
                            lastMessageTimestamp: newMessageTimestamp.toISOString(),
                            unreadCount: 0 
                        };
                    } else {
                         latestPlayNotificationSoundRef.current();
                         if (document.hidden) {
                           latestShowBrowserNotificationRef.current(
                             `New Message from ${nickname}`,
                             newAppMessage.text,
                             anonSessionId || ""
                           );
                         }
                    }
                    return currentSelectedChat; 
                });

            } else if (messagePayload.type === "ERROR") {
                console.error("WebSocket server error:", messagePayload.content);
                setUserError(`Chat server error: ${messagePayload.content}`);
            } else if (messagePayload.type === "INFO") {
                console.log("WebSocket server info:", messagePayload.content);
            }

        } catch (e) {
            console.error('Error processing incoming WebSocket message:', e);
        }
    };
    socket.onerror = (errorEvent) => {
        console.error('Authenticated WebSocket error:', errorEvent);
        setUserError('Chat connection error. Attempting to reconnect...');
        ws.current = null;
        setTimeout(() => {
            const currentToken = localStorage.getItem("token");
            if (currentToken && user?.username && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
                 console.log("Retrying WebSocket connection from onerror...");
                 connectWebSocket(currentToken);
            }
        }, 5000 + Math.random() * 3000);
    };

    socket.onclose = (closeEvent) => {
        console.log('Authenticated WebSocket connection closed:', closeEvent.code, closeEvent.reason);
        ws.current = null;
        if (!closeEvent.wasClean && user?.username && closeEvent.code !== 1000 ) {
             setUserError('Chat connection lost. Attempting to reconnect.');
             setTimeout(() => {
                const currentToken = localStorage.getItem("token");
                if (currentToken && user?.username && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
                    console.log("Retrying WebSocket connection after close...");
                    connectWebSocket(currentToken);
                }
             }, 5000 + Math.random() * 3000);
        }
    };
  }, [user?.username, router]); 


  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    const action = searchParams.get("action");
    const emailFromQuery = searchParams.get("email");
    const tempTokenFromQuery = searchParams.get("tempToken");

    if (action === "setUsername" && emailFromQuery && tempTokenFromQuery && !isSetUsernameModalOpen) {
        setModalEmail(emailFromQuery);
        setModalToken(tempTokenFromQuery);
        setIsLoadingUser(false); 
        setIsSetUsernameModalOpen(true);
        return; 
    }

    if (!tokenFromStorage && !isSetUsernameModalOpen) {
      router.push("/auth?error=no_token");
      return;
    }
    
    if (isInitialUserLoadComplete) { 
        setIsLoadingUser(false); 
        return; 
    }

    setIsLoadingUser(true);
    fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenFromStorage}` },
    })
    .then(async (res) => {
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem("token");
                router.push("/auth?sessionExpired=true");
            }
            const errorData = await res.json().catch(() => ({message: "Server returned an error."}));
            throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        return res.json();
    })
    .then((apiResponse: MeApiResponse) => {
        if (!apiResponse.success || !apiResponse.user || !apiResponse.user.id) {
            localStorage.removeItem("token");
            router.push("/auth?error=invalid_user_data");
            throw new Error(apiResponse.message || "Invalid user data received.");
        }

        const fetchedUser = apiResponse.user;
        const fullUser: User = {
            ...fetchedUser,
            chatLink: fetchedUser.username ? `${window.location.origin}/chat/${fetchedUser.username}` : ''
        };
        setUser(fullUser);

        if (fetchedUser.username === null) {
            setModalEmail(fetchedUser.email || null);
            setModalToken(tokenFromStorage);
            setIsSetUsernameModalOpen(true); 
        } else {
            setIsInitialUserLoadComplete(true); 
        }
    })
    .catch(err => {
        console.error("Failed to fetch user data:", err);
        setUserError((err as Error).message || "Failed to load dashboard data. Please try logging in again.");
        localStorage.removeItem("token");
        if (!isSetUsernameModalOpen && action !== "setUsername") {
             router.push("/auth?error=load_failed");
        }
    })
    .finally(() => {
        setIsLoadingUser(false);
    });

    return () => { 
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close(1000, "Dashboard unmounting");
        }
        ws.current = null;
    };
  }, [router, searchParams, isSetUsernameModalOpen, isInitialUserLoadComplete]); 


  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    if (isInitialUserLoadComplete && user && user.username && tokenFromStorage) {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING) {
        if (ws.current?.readyState !== WebSocket.CONNECTING) {
          connectWebSocket(tokenFromStorage);
        }
      }

      if (!initialChatsFetchAttempted) {
        console.log("Condition met: Fetching initial chats. initialChatsFetchAttempted:", initialChatsFetchAttempted);
        setInitialChatsFetchAttempted(true); 
        setIsLoadingChats(true);

        fetchUserChatsFromApi(tokenFromStorage)
          .then(fetchedApiChats => {
            console.log("fetchUserChatsFromApi successful, fetched count:", fetchedApiChats.length);
            setChats(fetchedApiChats);
            const chatIdFromUrl = searchParams.get('chatId');
            if (chatIdFromUrl) {
              const chatToSelect = fetchedApiChats.find(c => c.id.toString() === chatIdFromUrl);
              if (chatToSelect && (!selectedChat || selectedChat.id.toString() !== chatIdFromUrl)) {
                handleChatSelect(chatToSelect);
              }
            }
          })
          .catch(err => {
            console.error("Failed to fetch initial chats inside useEffect:", err);
            setUserError("Could not load your conversations. " + ((err as Error).message || "Please try refreshing."));
          })
          .finally(() => {
            setIsLoadingChats(false);
          });
      }
    }
  }, [
    isInitialUserLoadComplete,
    user, 
    initialChatsFetchAttempted, 
    connectWebSocket, 
    searchParams, 
    handleChatSelect, 
    selectedChat?.id 
  ]);


  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    if (isInitialUserLoadComplete && user && user.username && (chats.length > 0 || initialChatsFetchAttempted) ) {
        if (chatIdFromUrl) {
            const chatToSelect = chats.find(c => c.id.toString() === chatIdFromUrl);
            if (chatToSelect) {
                if (!selectedChat || selectedChat.id.toString() !== chatIdFromUrl) {
                    handleChatSelect(chatToSelect);
                }
            } else {
                if (initialChatsFetchAttempted && !isLoadingChats) { 
                    if (selectedChat) setSelectedChat(null); 
                    router.push('/dashboard', { scroll: false }); 
                }
            }
        }
    }
  }, [searchParams, chats, isInitialUserLoadComplete, user?.username, initialChatsFetchAttempted, isLoadingChats, handleChatSelect, selectedChat, router]);


  useEffect(() => {
    if (searchParams.get("action") === "setUsername" && !isSetUsernameModalOpen && user?.username === null && !isLoadingUser && isInitialUserLoadComplete === false) {
      setUserError("A username is required to use the dashboard. Please log in again to set your username.");
      setTimeout(handleLogout, 3000);
    }
  }, [isSetUsernameModalOpen, user?.username, router, handleLogout, searchParams, isLoadingUser, isInitialUserLoadComplete]);


  useEffect(() => {
    if (selectedChat?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChat?.messages]);

  const handleCopyLink = () => {
    if (user?.chatLink) {
      navigator.clipboard.writeText(user.chatLink)
        .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); })
        .catch(err => console.error('Failed to copy link: ', err));
    }
  };

  const handleUsernameSet = (newUsername: string) => {
    setIsSetUsernameModalOpen(false); 
    const updatedUser = {
        ...(user || {} as User), 
        username: newUsername,
        chatLink: `${window.location.origin}/chat/${newUsername}`
    };
    setUser(updatedUser as User);

    router.replace("/dashboard", { scroll: false }); 

    if (modalToken && localStorage.getItem("token") !== modalToken) {
        localStorage.setItem("token", modalToken);
    }
    setModalToken(null); setModalEmail(null);
    setIsInitialUserLoadComplete(true); 
  };

  const handleCloseUsernameModal = () => {
    setIsSetUsernameModalOpen(false); 
    router.replace("/dashboard", { scroll: false }); 
    if (user?.username === null) {
        setUserError("Username setup was cancelled. Please log in again if you wish to set a username.");
        setTimeout(handleLogout, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    if (!selectedChat.isAnonymous) {
        setUserError("Replies can only be sent to anonymous chats from this interface.");
        return;
    }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        setUserError("Not connected to chat server. Please wait or refresh.");
        const token = localStorage.getItem("token");
        if (token && user?.username) connectWebSocket(token); 
        return;
    }

    const anonSessionId = selectedChat.id;
    const currentMessageTimestamp = new Date();

    const messagePayload: WebSocketMessagePayload = {
      type: "USER_TO_ANON",
      from: user?.username || "DashboardUser",
      to: anonSessionId.toString(),
      content: newMessage.trim(),
      timestamp: currentMessageTimestamp.toISOString(),
    };

    const optimisticMessage: ChatMessage = {
      id: `msg-optimistic-${Date.now()}`, text: newMessage.trim(), sender: 'self',
      timestamp: currentMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      originalTimestamp: currentMessageTimestamp.toISOString(),
    };

    const currentSelectedChatId = selectedChat.id;
    setChats(prevChats => prevChats.map(c =>
      c.id === currentSelectedChatId
        ? { ...c,
            messages: [...c.messages, optimisticMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
            messagePreview: newMessage.trim(),
            lastMessageTimestamp: currentMessageTimestamp.toISOString()
          }
        : c
    ).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime())
    );
    setSelectedChat(prevSel => prevSel ? {
        ...prevSel,
        messages: [...prevSel.messages, optimisticMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()),
        lastMessageTimestamp: currentMessageTimestamp.toISOString()
      } : null);

    const currentMessageText = newMessage;
    setNewMessage('');

    try {
        ws.current.send(JSON.stringify(messagePayload));
    } catch (error) {
        console.error("Failed to send message via WebSocket:", error);
        setUserError("Failed to send message. Please try again.");
        setChats(prevChats => prevChats.map(c =>
            c.id === currentSelectedChatId
            ? { ...c, messages: c.messages.filter(m => m.id !== optimisticMessage.id), messagePreview: c.messages[c.messages.length -2]?.text || c.messagePreview } : c)
            .sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime())
        );
        setSelectedChat(prevSel => prevSel ? {...prevSel, messages: prevSel.messages.filter(m => m.id !== optimisticMessage.id)} : null);
        setNewMessage(currentMessageText); 
    }
  };
  
  const handleBackFromChatView = () => {
    setSelectedChat(null);
    router.push('/dashboard', { scroll: false });
  };

  const openChatActionModal = (action: 'delete' | 'close_chat'| 'logout') => {
    if (!selectedChat && action !== 'logout') return; 
     if (action === 'logout') {
      setChatModalContent({ title: 'Logout?', bodyText: `Are you sure you want to logout from AnonMsg?`, confirmText: 'Logout', action: 'logout', isDestructive: true });
    } else if (selectedChat) {
        if (action === 'delete') {
          setChatModalContent({ title: 'Delete Chat?', bodyText: `This will permanently delete the chat with ${selectedChat.sender}. This action cannot be undone.`, confirmText: 'Delete Permanently', action: 'delete', isDestructive: true });
        } else if (action === 'close_chat') { 
          setChatModalContent({ title: 'Close Chat?', bodyText: `Close chat with ${selectedChat.sender}? You can reopen it from the sidebar.`, confirmText: 'Close', action: 'close_chat', isDestructive: false });
        }
    }
    setIsChatModalOpen(true);
  };

  const handleConfirmChatModal = async () => {
    if (!chatModalContent.action) {
        setIsChatModalOpen(false);
        return;
    }
    
    if (chatModalContent.action === 'logout') {
        handleLogout();
        setIsChatModalOpen(false); 
    } else if (selectedChat && chatModalContent.action === 'delete') {
        const currentSelectedChatId = selectedChat.id.toString();
        const token = localStorage.getItem("token");

        if (!token) {
            setUserError("Authentication token not found. Cannot delete chat.");
            setIsChatModalOpen(false);
            return;
        }
        
        // Optional: Add a loading state for the modal confirm button
        // e.g., setChatModalContent(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/${currentSelectedChatId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setChats(prevChats => prevChats.filter(chat => chat.id.toString() !== currentSelectedChatId));
                setSelectedChat(null);
                router.push('/dashboard', { scroll: false }); 
                // Optionally, show a success toast/message here
            } else {
                const errorData = await response.json().catch(() => ({ message: "Failed to delete chat. Server returned an error." }));
                setUserError(errorData.message || `Failed to delete chat. Status: ${response.status}`);
            }
        } catch (error) {
            console.error("Error deleting chat session:", error);
            setUserError("An unexpected error occurred while trying to delete the chat.");
        } finally {
            setIsChatModalOpen(false);
            // setChatModalContent(prev => ({ ...prev, isLoading: false })); // Reset loading state
        }

    } else if (selectedChat && chatModalContent.action === 'close_chat') {
        setSelectedChat(null);
        router.push('/dashboard', { scroll: false }); 
        setIsChatModalOpen(false);
    } else {
        setIsChatModalOpen(false);
    }
  };


  if (isLoadingUser && !isInitialUserLoadComplete && !isSetUsernameModalOpen && !modalToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Loading your AnonMsg dashboard...</p>
      </div>
    );
  }

  if (userError && !isSetUsernameModalOpen) {
    return (
       <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h2>
        <p className="text-gray-600 mb-4 px-4">{userError}</p>
        <button onClick={() => { localStorage.removeItem("token"); router.push("/auth");}} className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors">
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
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AnonMsg!</h2>
            <p className="text-gray-600">Please set your username to continue.</p>
        </div>
      </>
    );
  }

  if ((!isInitialUserLoadComplete || !user || user.username === null) && !isLoadingUser) {
      console.warn("User data incomplete or username null, redirecting to auth.");
      if (typeof window !== "undefined") router.push("/auth?error=user_setup_incomplete");
      return ( 
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mr-3" />
            <p className="text-gray-600 text-lg">Redirecting...</p>
        </div>
      );
  }


  return (
    <>
      <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">

        <aside className={`
          ${selectedChat && searchParams.get('chatId') ? 'hidden' : 'flex'} 
          md:flex
          flex-col w-full md:w-80 lg:w-96
          bg-gray-50 border-r border-gray-200
          h-full md:h-auto md:overflow-y-auto
        `}>
          <div className="hidden md:flex p-4 md:p-5 border-b border-gray-200 justify-between items-center sticky top-0 bg-gray-50 z-10">
            <div className="flex items-center space-x-2"><MessageSquareText className="h-8 w-8 text-teal-500" /><h2 className="text-xl font-bold text-gray-800">My Chats</h2></div>
            <div className="flex items-center space-x-1">
                <button
                    onClick={requestNotificationPermission}
                    title={notificationPermission === 'granted' ? "Notifications Enabled" : "Enable Notifications"}
                    className={`p-2 rounded-lg transition-colors ${
                        notificationPermission === 'granted' ? 'text-green-500 hover:bg-green-50' :
                        notificationPermission === 'denied' ? 'text-red-500 hover:bg-red-50 cursor-not-allowed' :
                        'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
                    }`}
                    disabled={notificationPermission === 'denied'}
                >
                    <BellDot size={20} />
                </button>
                <button onClick={() => openChatActionModal('logout')} title="Logout" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
            </div>
          </div>

           <div className="md:hidden p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
            <div className="flex items-center space-x-2">
              <MessageSquareText className="h-7 w-7 text-teal-600" />
              <h1 className="text-lg font-bold text-gray-800">AnonMsg Inbox</h1>
            </div>
             <div className="flex items-center space-x-1">
                <button
                    onClick={requestNotificationPermission}
                    title={notificationPermission === 'granted' ? "Notifications Enabled" : "Enable Notifications"}
                    className={`p-2 rounded-lg transition-colors ${
                        notificationPermission === 'granted' ? 'text-green-500 hover:bg-green-50' :
                        notificationPermission === 'denied' ? 'text-red-500 hover:bg-red-50 cursor-not-allowed' :
                        'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
                    }`}
                     disabled={notificationPermission === 'denied'}
                >
                    <BellDot size={20} />
                </button>
                <button onClick={() => openChatActionModal('logout')} title="Logout" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
             </div>
          </div>

           <div className="p-4 border-b border-gray-200 bg-teal-50">
                <h3 className="text-sm font-semibold text-teal-700 mb-1.5 flex items-center">
                    <Link2Icon size={16} className="mr-1.5 text-teal-600" />
                    Your Anonymous Link:
                </h3>
                <div className="bg-white p-2.5 rounded-lg text-xs text-teal-800 break-all mb-2.5 shadow-sm border border-teal-200 min-h-[3.5em] flex items-center">
                    {user?.chatLink || (user?.username ? `${window.location.origin}/chat/${user.username}` : "Set username to get link")}
                </div>
                <button onClick={handleCopyLink} disabled={!user?.chatLink || copiedLink}
                    className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${!user?.chatLink ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : copiedLink ? 'bg-green-500 text-white border-green-600' : 'bg-teal-500 text-white border-teal-600 hover:bg-teal-600 focus:ring-2 focus:ring-teal-400'}`}>
                    <Copy size={16} /><span>{copiedLink ? "Link Copied!" : "Copy My Link"}</span>
                </button>
                <p className="text-xs text-teal-600 mt-2.5">Share this link anywhere to start receiving anonymous messages!</p>
            </div>

          <div className="flex-grow overflow-y-auto p-2">
            {isLoadingChats ? ( 
                <div className="flex justify-center items-center h-full text-teal-500 p-4"> 
                    <Loader2 className="w-8 h-8 animate-spin mr-2" />
                    <span>Loading your conversations...</span>
                </div>
            ) : initialChatsFetchAttempted && chats.length === 0 ? ( 
              <div className="text-center text-gray-500 py-10 px-4">
                <MessageSquareText size={48} className="mx-auto mb-3 text-gray-400" />
                <h3 className="font-semibold text-lg text-gray-600 mb-1">No Chats Found</h3>
                <p className="text-sm">Please share your link to start receiving chats.</p>
              </div>
            ) : chats.length > 0 ? ( 
              <SidebarContent chats={chats} selectedChat={selectedChat} onChatSelect={handleChatSelect} />
            ) : (
              !initialChatsFetchAttempted && (!user || !user.username) ?
              <div className="text-center text-gray-400 py-10 px-4 text-sm">Please complete user setup to see chats.</div> :
              !initialChatsFetchAttempted ?
              <div className="text-center text-gray-400 py-10 px-4 text-sm">Preparing to load chats...</div>
              : null 
            )}
          </div>
        </aside>

        <main className={`
          ${selectedChat && searchParams.get('chatId') ? 'flex' : 'hidden'} 
          md:flex
          flex-grow flex-col relative overflow-hidden bg-white
          h-full md:h-auto
        `}>
          {selectedChat && searchParams.get('chatId') === selectedChat.id.toString() ? ( 
            <ChatView key={selectedChat.id} chat={selectedChat} onSendMessage={handleSendMessage} newMessage={newMessage} setNewMessage={setNewMessage} messagesEndRef={messagesEndRef}
                      onBack={handleBackFromChatView} 
                      onOpenModal={openChatActionModal} />
          ) : (
            <div className="hidden md:flex flex-col flex-grow items-center justify-center p-6 md:p-10 bg-white text-center">
              <MessageSquareText className="w-20 h-20 text-teal-300 mb-5 animate-pulse" style={{animationDuration: '3s'}} />
              <h2 className="text-2xl font-semibold text-gray-700 mb-1">Welcome to your Dashboard!</h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Select a conversation from the sidebar to view messages, or share your anonymous link (found in the sidebar) to start receiving them.
              </p>

              {userError && !isLoadingChats && (!ws.current || ws.current.readyState !== WebSocket.OPEN) && ws.current?.readyState !== WebSocket.CONNECTING && (
                <p className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200 flex items-center">
                    <AlertTriangle size={16} className="mr-2 flex-shrink-0" /> {userError}
                </p>
              )}
              {ws.current && ws.current.readyState === WebSocket.CONNECTING && (
                    <p className="mt-4 text-yellow-600 text-sm flex items-center"><Loader2 size={16} className="animate-spin mr-2" />Connecting to chat server...</p>
                )}
            </div>
          )}
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