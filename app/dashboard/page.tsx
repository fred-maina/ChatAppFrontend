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

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalContent, setChatModalContent] = useState<{
    title: string;
    confirmText: string;
    action: 'delete' | 'close_chat' | null;
    bodyText?: string;
    isDestructive?: boolean;
  }>({ title: '', confirmText: '', action: null });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

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
    router.push("/auth?logged_out=true");
  }, [router, setChats, setSelectedChat, setUser]);

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
  }, [setNotificationPermission, setUserError]);


  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.warn("Error playing notification sound:", error));
    }
  }, [audioRef]);

  const handleChatSelect = useCallback((chat: Chat) => {
    const isNewChatSelected = !selectedChat || selectedChat.id !== chat.id;
    const currentUnreadCount = chat.unreadCount || 0;

    setSelectedChat(prevSelected => {
        if (isNewChatSelected) {
            setChats(prevChats =>
                prevChats.map(c =>
                    c.id === chat.id ? { ...c, unreadCount: 0 } : c
                ).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime())
            );
            if (currentUnreadCount > 0 && ws.current && ws.current.readyState === WebSocket.OPEN) {
                const markAsReadMessage: WebSocketMessagePayload = {
                    type: "MARK_AS_READ",
                    chatId: chat.id,
                };
                try {
                    ws.current.send(JSON.stringify(markAsReadMessage));
                    console.log("Sent MARK_AS_READ for chat:", chat.id);
                } catch (error) {
                    console.error("Failed to send MARK_AS_READ message:", error);
                }
            }
            return {...chat, unreadCount: 0};
        }
        return prevSelected;
    });
  }, [selectedChat, setChats, setSelectedChat]);

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


  const connectWebSocket = useCallback((token: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected.");
        return;
    }
    if (!token) {
        console.error("No token available for WebSocket connection.");
        setUserError("Authentication token missing, cannot connect to chat server.");
        if (typeof window !== "undefined") router.push("/auth?error=ws_token_missing");
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

                setChats(prevChats => {
                    let chatExists = false;
                    const updatedChats = prevChats.map(chat => {
                        if (chat.id === anonSessionId) {
                            chatExists = true;
                            const updatedMessages = [...chat.messages, newAppMessage]
                                .sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime());
                            return {
                                ...chat,
                                messages: updatedMessages,
                                messagePreview: newAppMessage.text,
                                unreadCount: (selectedChat && selectedChat.id === anonSessionId) ? 0 : (chat.unreadCount || 0) + 1,
                                lastMessageTimestamp: newMessageTimestamp.toISOString(),
                            };
                        }
                        return chat;
                    });

                    if (chatExists) {
                        return updatedChats.sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
                    } else {
                        const newChat: Chat = {
                            id: anonSessionId || "",
                            sender: nickname,
                            messagePreview: newAppMessage.text,
                            messages: [newAppMessage],
                            avatar: `https://i.pravatar.cc/150?u=${anonSessionId}`,
                            isAnonymous: true,
                            unreadCount: (selectedChat && selectedChat.id === anonSessionId) ? 0 : 1,
                            lastMessageTimestamp: newMessageTimestamp.toISOString(),
                        };
                        return [newChat, ...prevChats].sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
                    }
                });

                setSelectedChat(prevSelected => {
                    if (prevSelected && prevSelected.id === anonSessionId) {
                        const updatedMessages = [...prevSelected.messages, newAppMessage]
                             .sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime());
                        return {
                            ...prevSelected,
                            messages: updatedMessages,
                            messagePreview: newAppMessage.text,
                            lastMessageTimestamp: newMessageTimestamp.toISOString(),
                        };
                    }
                    return prevSelected;
                });

                playNotificationSound();
                if (document.hidden || (selectedChat && selectedChat.id !== anonSessionId)) {
                  showBrowserNotification(
                    `New Message from ${nickname}`,
                    newAppMessage.text,
                    anonSessionId || ""
                  );
                }

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
                 console.log("Retrying WebSocket connection...");
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
  }, [ws, setUserError, router, user?.username, setChats, setSelectedChat, playNotificationSound, showBrowserNotification, selectedChat, notificationPermission, chats]);

  // Main Effect for user loading and initial setup
  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    const action = searchParams.get("action");
    const emailFromQuery = searchParams.get("email");
    const tempTokenFromQuery = searchParams.get("tempToken");

    // Scenario 1: Initial load with action=setUsername from OAuth callback
    if (action === "setUsername" && emailFromQuery && tempTokenFromQuery) {
      setModalEmail(emailFromQuery);
      setModalToken(tempTokenFromQuery);
      // We are showing a modal, so dashboard is not "fully loading" in the background
      setIsLoadingUser(false);
      setIsSetUsernameModalOpen(true);
      return; // Crucial: Stop execution of this useEffect run
    }

    // Scenario 2: No token, redirect to auth. Only if we aren't already opening the modal with a temp token.
    if (!tokenFromStorage && !isSetUsernameModalOpen) {
      router.push("/auth?error=no_token");
      return;
    }

    // Scenario 3: Token exists, and user data hasn't been loaded OR username needs to be set
    // This condition ensures the fetch only runs when user data is not present or username is null
    // And prevents re-fetching if the user object already has a username and we're not waiting for modal action.
    if (user && user.username !== null) {
        // User is loaded and has a username, ensure WS is connected and chats are loaded
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
            connectWebSocket(tokenFromStorage!);
        }
        if (chats.length === 0 && !isLoadingChats) { // Prevent re-fetching if already fetched
            setIsLoadingChats(true);
            fetchUserChatsFromApi(tokenFromStorage!).then(fetchedApiChats => {
                setChats(fetchedApiChats);
            }).catch(err => {
                console.error("Failed to fetch initial chats:", err);
                setUserError("Could not load your conversations initially. " + (err as Error).message);
            }).finally(() => setIsLoadingChats(false));
        }
        setIsLoadingUser(false); // User is loaded, no more loading state
        return; // Exit if user is already loaded and has username
    }

    // If we reach here, it means user is null OR user.username is null.
    // Proceed to fetch user data.
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
            setIsSetUsernameModalOpen(true); // Open modal if username is null
        } else {
            // Username is set, connect WS and fetch chats
            connectWebSocket(tokenFromStorage!);
            setIsLoadingChats(true);
            fetchUserChatsFromApi(tokenFromStorage!).then(fetchedApiChats => {
                setChats(fetchedApiChats);
            }).catch(err => {
                console.error("Failed to fetch initial chats:", err);
                setUserError("Could not load your conversations initially. " + (err as Error).message);
            }).finally(() => setIsLoadingChats(false));
        }
    })
    .catch(err => {
        console.error("Failed to fetch user data:", err);
        setUserError((err as Error).message || "Failed to load dashboard data. Please try logging in again.");
        localStorage.removeItem("token");
        // Only redirect if username modal is not being handled
        if (!isSetUsernameModalOpen && action !== "setUsername") {
             router.push("/auth?error=load_failed");
        }
    })
    .finally(() => {
        // isLoadingUser should be false regardless of modal state once fetch is done
        setIsLoadingUser(false);
    });


    // Cleanup for WebSocket connection on unmount
    return () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close(1000, "Dashboard unmounting");
        }
        ws.current = null;
    };
  }, [connectWebSocket, router, searchParams, user, chats.length, isLoadingChats]);


  // This useEffect ensures the username modal is only closed when needed.
  // This effect will only run if the username modal was explicitly closed AND username is still null
  // This is the "forced logout" logic
  useEffect(() => {
    // Only apply this logic if the action is specifically to set username (e.g. from OAuth)
    // AND the modal was closed (or never opened, but user.username is null)
    // AND the user still has no username.
    // If the modal was opened via fetchedUser.username === null, then isSetUsernameModalOpen would be true
    // If the user closed it, isSetUsernameModalOpen becomes false.
    if (searchParams.get("action") === "setUsername" && !isSetUsernameModalOpen && !user?.username && !isLoadingUser && !userError) {
      setUserError("A username is required to use the dashboard. Please log in again to set your username.");
      setTimeout(handleLogout, 3000);
    }
  }, [isSetUsernameModalOpen, user?.username, router, handleLogout, searchParams, isLoadingUser, userError]);


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
    const tokenForWS = modalToken || localStorage.getItem("token");
    setIsSetUsernameModalOpen(false); // Close the modal
    setUser(prevUser => prevUser ? {
        ...prevUser, username: newUsername,
        chatLink: `${window.location.origin}/chat/${newUsername}`
    } : null);

    router.replace("/dashboard", { scroll: false }); // Clean up URL params

    if (tokenForWS && newUsername) {
        connectWebSocket(tokenForWS);
        setIsLoadingChats(true);
        fetchUserChatsFromApi(tokenForWS).then(fetchedChats => setChats(fetchedChats))
        .catch(err => {
            console.error("Failed to fetch chats post username set", err);
            setUserError("Could not load conversations: " + (err as Error).message);
        })
        .finally(() => setIsLoadingChats(false));
    }
    // If we used a temporary token from OAuth callback, store it permanently
    if (modalToken && localStorage.getItem("token") !== modalToken) {
        localStorage.setItem("token", modalToken);
    }
    setModalToken(null); setModalEmail(null);
    setIsLoadingUser(false); // User is now loaded and username set
  };

  // This function is explicitly called when the user tries to close the modal
  const handleCloseUsernameModal = () => {
    setIsSetUsernameModalOpen(false); // Set to false to close the modal
    router.replace("/dashboard", { scroll: false }); // Clean up URL params

    // If user still has no username, then force logout
    if (!user?.username) {
        setUserError("A username is required to use the dashboard. Please log in again to set your username.");
        setTimeout(handleLogout, 3000);
    }
    // Clear modal related state, not loading state
    setModalToken(null);
    setModalEmail(null);
    // Do NOT set isLoadingUser here unless it's genuinely still loading something unrelated
    // This function's role is to handle modal closure, not user loading state broadly.
    // The main useEffect handles setting isLoadingUser based on user fetch.
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

  const openChatActionModal = (action: 'delete' | 'close_chat'| 'logout') => {
    if (!selectedChat) return;
    if (action === 'delete') {
      setChatModalContent({ title: 'Delete Chat?', bodyText: `This will remove the chat with ${selectedChat.sender} from your view. This action may not be recoverable.`, confirmText: 'Delete', action: 'delete', isDestructive: true });
    } else if (action === 'close_chat') {
      setChatModalContent({ title: 'Close Chat?', bodyText: `Close chat with ${selectedChat.sender}? You can reopen it from the sidebar.`, confirmText: 'Close', action: 'close_chat', isDestructive: false });
    }
    setIsChatModalOpen(true);
  };

  const handleConfirmChatModal = async () => {
    if (!selectedChat || !chatModalContent.action) {
        setIsChatModalOpen(false); return;
    }
    const currentSelectedChatId = selectedChat.id;

    if (chatModalContent.action === 'delete') {
        setChats(prevChats => prevChats.filter(chat => chat.id !== currentSelectedChatId));
        setSelectedChat(null);
    } else if (chatModalContent.action === 'close_chat') {
      setSelectedChat(null);
    }
    setIsChatModalOpen(false);
  };


  if (isLoadingUser && !isSetUsernameModalOpen && !modalToken) {
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

  // Render the SetUsernameModal if it should be open
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

  // If we reach here, modal is not open, and user should exist and have a username.
  if (!user || user.username === null) {
      // This is a fallback in case the state is inconsistent.
      // It should ideally be caught by the modal opening logic above.
      console.warn("User is not fully loaded or username is null, but modal is not open. Redirecting.");
      if (typeof window !== "undefined") router.push("/auth?error=unknown_state_no_username");
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mr-3" />
            <p className="text-gray-600 text-lg">Finalizing dashboard...</p>
        </div>
      );
  }


  return (
    <>
      <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">

        <aside className={`
          ${selectedChat ? 'hidden' : 'flex'} md:flex
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
                <button onClick={handleLogout} title="Logout" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
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
                <button onClick={handleLogout} title="Logout" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
             </div>
          </div>

           <div className="p-4 border-b border-gray-200 bg-teal-50">
                <h3 className="text-sm font-semibold text-teal-700 mb-1.5 flex items-center">
                    <Link2Icon size={16} className="mr-1.5 text-teal-600" />
                    Your Anonymous Link:
                </h3>
                <div className="bg-white p-2.5 rounded-lg text-xs text-teal-800 break-all mb-2.5 shadow-sm border border-teal-200 min-h-[3.5em] flex items-center">
                    {user.chatLink || (user.username ? `${window.location.origin}/chat/${user.username}` : "Set username to get link")}
                </div>
                <button onClick={handleCopyLink} disabled={!user.chatLink || copiedLink}
                    className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${!user.chatLink ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : copiedLink ? 'bg-green-500 text-white border-green-600' : 'bg-teal-500 text-white border-teal-600 hover:bg-teal-600 focus:ring-2 focus:ring-teal-400'}`}>
                    <Copy size={16} /><span>{copiedLink ? "Link Copied!" : "Copy My Link"}</span>
                </button>
                <p className="text-xs text-teal-600 mt-2.5">Share this link anywhere to start receiving anonymous messages!</p>
            </div>

          <div className="flex-grow overflow-y-auto p-2">
            {isLoadingChats && chats.length === 0 ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>
            ) : chats.length > 0 ? (
              <SidebarContent chats={chats} selectedChat={selectedChat} onChatSelect={handleChatSelect} />
            ) : (
              <div className="text-center text-gray-500 py-10 px-4">
                <MessageSquareText size={40} className="mx-auto mb-2 text-gray-400" />
                <h3 className="font-semibold text-md text-gray-600">No Chats Yet</h3>
                <p className="text-xs">Messages from your link will appear here.</p>
              </div>
            )}
          </div>
        </aside>

        <main className={`
          ${selectedChat ? 'flex' : 'hidden'} md:flex
          flex-grow flex-col relative overflow-hidden bg-white
          h-full md:h-auto
        `}>
          {selectedChat ? (
            <ChatView key={selectedChat.id} chat={selectedChat} onSendMessage={handleSendMessage} newMessage={newMessage} setNewMessage={setNewMessage} messagesEndRef={messagesEndRef}
                      onBack={() => setSelectedChat(null)}
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
      <Modal isOpen={isChatModalOpen} onClose={() => setIsChatModalOpen(false)} onConfirm={handleConfirmChatModal} title={chatModalContent.title} confirmButtonText={chatModalContent.confirmText} isDestructive={chatModalContent.isDestructive}>
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