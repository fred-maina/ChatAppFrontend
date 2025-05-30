// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  MessageSquareText,
  Settings,
  Share2,
  Copy,
  Home,
  Menu,
  X,
  AlertTriangle,
  SendHorizontal,
  Trash2,
  Loader2
} from "lucide-react";

import SidebarContent from "../Components/SidebarContent";
import ChatView from "../Components/ChatView";
import Modal from "../Components/Modal";
import SetUsernameModal from "../Components/SetUsernameModal";
import { Chat, ChatMessage as AppChatMessage, WebSocketMessagePayload } from "../types";

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";


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

// Expected backend structures for chat data
interface BackendChatMessage {
    id: string;
    text: string;
    senderType: 'self' | 'anonymous'; // From perspective of the dashboard owner
    timestamp: string; // ISO 8601
    nickname?: string; // Nickname of the anonymous sender
}

interface BackendChat {
    id: string; // This should be the anonSessionId for the anonymous chat
    senderNickname: string; // Nickname of the anonymous user
    lastMessage: string;
    lastMessageTimestamp: string; // ISO 8601
    unreadCount?: number;
    avatarUrl?: string;
    messages: BackendChatMessage[]; // All messages, sorted by timestamp
}


const fetchUserChatsFromApi = async (token: string): Promise<Chat[]> => {
  console.log("Attempting to fetch initial chats with token:", token ? "Token Present" : "Token Missing");

  const response = await fetch(`${API_BASE_URL}/api/chats`, { // Using your specified endpoint
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to parse error from /api/chats" }));
    console.error("API Error fetching chats:", response.status, errorData);
    // You might want to throw a specific error or return empty array based on how critical this is
    // For now, throwing an error that can be caught by the caller
    throw new Error(errorData.message || `Failed to fetch chats. Status: ${response.status}`);
  }

  const backendChats: BackendChat[] = await response.json();

  // Transform backend data to frontend Chat[] structure
  return backendChats.map((backendChat: BackendChat): Chat => {
    const transformedMessages = backendChat.messages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((msg: BackendChatMessage): AppChatMessage => ({
        id: msg.id,
        text: msg.text,
        // 'sender' in AppChatMessage: 'self' for dashboard user, or the anonymous user's nickname
        sender: msg.senderType === 'self' ? 'self' : (msg.nickname || backendChat.senderNickname),
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nickname: msg.senderType === 'anonymous' ? (msg.nickname || backendChat.senderNickname) : undefined,
      }));

    return {
      id: backendChat.id, // This is the anonSessionId, used as Chat ID
      sender: backendChat.senderNickname, // Display name for the chat in the sidebar
      messagePreview: backendChat.lastMessage || (transformedMessages.length > 0 ? transformedMessages[transformedMessages.length - 1].text : "No messages yet"),
      messages: transformedMessages,
      unreadCount: backendChat.unreadCount || 0,
      avatar: backendChat.avatarUrl || `https://i.pravatar.cc/150?u=${backendChat.id}`, // Fallback avatar
      isAnonymous: true, // All chats fetched from /api/chats are with anonymous users
    };
  });
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const ws = useRef<WebSocket | null>(null);


  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    const action = searchParams.get("action");
    const emailFromQuery = searchParams.get("email");
    const tempTokenFromQuery = searchParams.get("tempToken");

    if (action === "setUsername" && emailFromQuery && tempTokenFromQuery) {
      setModalEmail(emailFromQuery);
      setModalToken(tempTokenFromQuery);
      setIsSetUsernameModalOpen(true);
      setIsLoadingUser(false);
    } else if (!tokenFromStorage) {
      router.push("/auth?error=no_token");
    } else {
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

            if (fetchedUser.username === null && action !== "setUsername") {
                setModalEmail(fetchedUser.email || null);
                setModalToken(tokenFromStorage);
                setIsSetUsernameModalOpen(true);
            } else if (fetchedUser.username) {
                connectWebSocket(tokenFromStorage);
                setIsLoadingChats(true);
                fetchUserChatsFromApi(tokenFromStorage).then(fetchedApiChats => {
                    setChats(prevChats => {
                        const chatIds = new Set(prevChats.map(c => c.id));
                        const newChatsFromApi = fetchedApiChats.filter(ac => !chatIds.has(ac.id));
                        return [...prevChats, ...newChatsFromApi].sort((a,b) => new Date(b.messages[b.messages.length-1]?.timestamp || 0).getTime() - new Date(a.messages[a.messages.length-1]?.timestamp || 0).getTime());
                    });
                }).catch(err => {
                    console.error("Failed to fetch initial chats:", err);
                    setUserError("Could not load your conversations initially. " + err.message);
                }).finally(() => setIsLoadingChats(false));
            }
        })
        .catch(err => {
            console.error("Failed to fetch user data:", err);
            setUserError(err.message || "Failed to load dashboard data. Please try logging in again.");
            localStorage.removeItem("token");
             if (!isSetUsernameModalOpen) router.push("/auth?error=load_failed");
        }).finally(() => {
            if(!isSetUsernameModalOpen) setIsLoadingUser(false);
        });
    }
    return () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close(1000, "Dashboard unmounting");
        }
        ws.current = null;
    };
  }, [router, searchParams]);

  const connectWebSocket = (token: string) => {
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
        setUserError(null); // Clear connection errors on successful open
    };

    socket.onmessage = (event) => {
        try {
            const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string);
            console.log("Dashboard received message:", messagePayload);

            if (messagePayload.type === "ANON_TO_USER") {
                const anonSessionId = messagePayload.from; // This is the Chat.id
                const nickname = messagePayload.nickname || "Anonymous";
                const newMessageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date();

                const newAppMessage: AppChatMessage = {
                    id: `msg-${Date.now()}-${Math.random()}`,
                    text: messagePayload.content,
                    sender: nickname, // From anonymous user, so sender is their nickname
                    timestamp: newMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    nickname: nickname,
                };

                setChats(prevChats => {
                    let chatExists = false;
                    const updatedChats = prevChats.map(chat => {
                        if (chat.id === anonSessionId) {
                            chatExists = true;
                            const updatedMessages = [...chat.messages, newAppMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            return {
                                ...chat,
                                messages: updatedMessages,
                                messagePreview: newAppMessage.text,
                                unreadCount: (selectedChat && selectedChat.id === anonSessionId) ? 0 : (chat.unreadCount || 0) + 1,
                            };
                        }
                        return chat;
                    });

                    if (chatExists) {
                        // Move updated chat to the top
                        const chatToMove = updatedChats.find(c => c.id === anonSessionId)!;
                        const restOfChats = updatedChats.filter(c => c.id !== anonSessionId);
                        return [chatToMove, ...restOfChats];
                    } else {
                        // Create new chat and add to top
                        const newChat: Chat = {
                            id: anonSessionId,
                            sender: nickname,
                            messagePreview: newAppMessage.text,
                            messages: [newAppMessage],
                            avatar: `https://i.pravatar.cc/150?u=${anonSessionId}`,
                            isAnonymous: true,
                            unreadCount: 1, // New chat, so 1 unread message
                        };
                        return [newChat, ...prevChats];
                    }
                });
                setSelectedChat(prevSelected => {
                    if (prevSelected && prevSelected.id === anonSessionId) {
                        const updatedMessages = [...prevSelected.messages, newAppMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        return {
                            ...prevSelected,
                            messages: updatedMessages,
                            messagePreview: newAppMessage.text,
                        };
                    }
                    return prevSelected;
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
        setUserError('Chat connection error. Retrying in 5 seconds...');
        ws.current = null;
        setTimeout(() => {
            const currentToken = localStorage.getItem("token");
            if (currentToken && user?.username) connectWebSocket(currentToken);
        }, 5000);
    };

    socket.onclose = (closeEvent) => {
        console.log('Authenticated WebSocket connection closed:', closeEvent.code, closeEvent.reason);
        ws.current = null;
        if (!closeEvent.wasClean && user?.username && closeEvent.code !== 1000 /* Normal closure */) {
             setUserError('Chat connection closed. Retrying in 5 seconds.');
             setTimeout(() => {
                const currentToken = localStorage.getItem("token");
                if (currentToken && user?.username) connectWebSocket(currentToken);
             }, 5000);
        }
    };
};


  useEffect(() => {
    if (selectedChat?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChat?.messages]);

  const handleLogout = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, "User logging out");
    }
    ws.current = null;
    localStorage.removeItem("token");
    setUser(null); setChats([]); setSelectedChat(null);
    router.push("/auth?logged_out=true");
  };

  const handleCopyLink = () => {
    if (user?.chatLink) {
      navigator.clipboard.writeText(user.chatLink)
        .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); })
        .catch(err => console.error('Failed to copy link: ', err));
    }
  };

  const handleUsernameSet = (newUsername: string) => {
    const tokenForWS = modalToken || localStorage.getItem("token");
    setIsSetUsernameModalOpen(false);
    setUser(prevUser => prevUser ? {
        ...prevUser, username: newUsername,
        chatLink: `${window.location.origin}/chat/${newUsername}`
    } : null);

    router.replace("/dashboard", { scroll: false }); // Clear query params

    if (tokenForWS && newUsername) {
        connectWebSocket(tokenForWS);
        setIsLoadingChats(true);
        fetchUserChatsFromApi(tokenForWS).then(fetchedChats => setChats(fetchedChats))
        .catch(err => {
            console.error("Failed to fetch chats post username set", err);
            setUserError("Could not load conversations: " + err.message);
        })
        .finally(() => setIsLoadingChats(false));
    }
    if (modalToken && localStorage.getItem("token") !== modalToken) {
        localStorage.setItem("token", modalToken); // Ensure the tempToken (if used) is now the main token
    }
    setModalToken(null); setModalEmail(null);
  };

  const handleCloseUsernameModal = () => {
    setIsSetUsernameModalOpen(false);
    router.replace("/dashboard", { scroll: false }); // Clear query params
    if (!user?.username) { // If they close without setting, and they still don't have a username
        setUserError("A username is required to use the dashboard. Please log in again to set your username.");
        // Log them out as they can't proceed without a username
        setTimeout(handleLogout, 3000);
    }
    setModalToken(null); setModalEmail(null);
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(prevSelected => {
        if (!prevSelected || prevSelected.id !== chat.id) {
            setChats(prevChats => prevChats.map(c =>
                c.id === chat.id ? { ...c, unreadCount: 0 } : c
            ));
            return chat;
        }
        return prevSelected; 
    });
    setIsMobileSidebarOpen(false); // Close mobile sidebar on chat selection
};


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    if (!selectedChat.isAnonymous) {
        setUserError("Replies can only be sent to anonymous chats from this interface.");
        return;
    }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        setUserError("Not connected to chat server. Please wait or refresh.");
        return;
    }

    const anonSessionId = selectedChat.id; 

    const messagePayload: WebSocketMessagePayload = {
      type: "USER_TO_ANON",
      from: user?.username || "DashboardUser", 
      to: anonSessionId.toString(),
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const optimisticMessage: AppChatMessage = {
      id: `msg-optimistic-${Date.now()}`, text: newMessage.trim(), sender: 'self',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    // Optimistically update UI
    const currentSelectedChatId = selectedChat.id;
    setChats(prevChats => prevChats.map(c =>
      c.id === currentSelectedChatId
        ? { ...c, messages: [...c.messages, optimisticMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), messagePreview: newMessage.trim() } : c));
    setSelectedChat(prevSel => prevSel ? {...prevSel, messages: [...prevSel.messages, optimisticMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())} : null);

    const currentMessageText = newMessage;
    setNewMessage('');

    try {
        ws.current.send(JSON.stringify(messagePayload));
    } catch (error) {
        console.error("Failed to send message via WebSocket:", error);
        setUserError("Failed to send message. Please try again.");
        // Rollback optimistic update on error
        setChats(prevChats => prevChats.map(c =>
            c.id === currentSelectedChatId
            ? { ...c, messages: c.messages.filter(m => m.id !== optimisticMessage.id), messagePreview: c.messages[c.messages.length -2]?.text || c.messagePreview } : c));
        setSelectedChat(prevSel => prevSel ? {...prevSel, messages: prevSel.messages.filter(m => m.id !== optimisticMessage.id)} : null);
        setNewMessage(currentMessageText); // Restore message to input
    }
  };

  const openChatActionModal = (action: 'delete' | 'close_chat') => {
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
    if (chatModalContent.action === 'delete') {
        // TODO: Implement backend chat deletion if supported via API
        // For now, local removal:
        setChats(prevChats => prevChats.filter(chat => chat.id !== selectedChat.id));
        setSelectedChat(null);
    } else if (chatModalContent.action === 'close_chat') {
      setSelectedChat(null);
      // On mobile, if closing a chat, good to show the sidebar again
      if (window.innerWidth < 768) { // md breakpoint
        setIsMobileSidebarOpen(true);
      }
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
  
  // If modal is open, or user has no username (and not loading, no error yet), show modal.
  if (isSetUsernameModalOpen || (!user?.username && !isLoadingUser && !userError)) {
    return (
      <>
        <SetUsernameModal isOpen={true} onClose={handleCloseUsernameModal} onUsernameSet={handleUsernameSet}
          email={modalEmail || user?.email || null} currentUsername={user?.username} token={modalToken || localStorage.getItem("token")} />
        {/* Background content shown while modal is active */}
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 filter blur-sm">
            <MessageSquareText className="w-16 h-16 text-teal-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AnonMsg!</h2>
            <p className="text-gray-600">Please set your username to continue.</p>
        </div>
      </>
    );
  }


  if (!user) { // Should be caught by earlier checks, but as a fallback
      if (typeof window !== "undefined") router.push("/auth?error=unknown_state"); // Redirect if no user and not in a modal state
      return ( // Fallback loading screen if somehow this state is reached
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mr-3" />
            <p className="text-gray-600 text-lg">Finalizing dashboard...</p>
        </div>
      );
  }

  return (
    <>
      <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden p-3 bg-teal-600 text-white flex justify-between items-center fixed top-0 left-0 right-0 z-30 shadow-lg">
            <div className="flex items-center space-x-2"> <MessageSquareText className="h-7 w-7" /><h1 className="text-lg font-bold">AnonMsg Inbox</h1></div>
            <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="p-1">{isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>

        {/* Sidebar (Chat List) */}
        <aside className={`${isMobileSidebarOpen ? 'block' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 fixed md:static inset-0 z-20 md:z-auto bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 pt-16 md:pt-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="hidden md:flex p-4 md:p-5 border-b border-gray-200 justify-between items-center sticky top-0 bg-gray-50 z-10">
            <div className="flex items-center space-x-2"><MessageSquareText className="h-8 w-8 text-teal-500" /><h2 className="text-xl font-bold text-gray-800">My Chats</h2></div>
            <button onClick={handleLogout} title="Logout" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
          </div>
           <div className="p-4 border-b border-gray-200 bg-teal-50">
                <h3 className="text-sm font-semibold text-teal-700 mb-1">Your Anonymous Link:</h3>
                <div className="bg-white p-2 rounded-md text-xs text-teal-900 break-all mb-2 shadow-sm border border-teal-200 min-h-[3em] flex items-center">
                    {user.chatLink || (user.username ? `${window.location.origin}/chat/${user.username}` : "Set username to get link")}
                </div>
                <button onClick={handleCopyLink} disabled={!user.chatLink || copiedLink}
                    className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2 border rounded-md text-xs font-medium transition-colors ${!user.chatLink ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : copiedLink ? 'bg-green-500 text-white border-green-500' : 'bg-teal-500 text-white border-teal-500 hover:bg-teal-600'}`}>
                    <Copy size={14} /><span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
                <p className="text-xs text-teal-600 mt-2">Share this link to get anonymous messages!</p>
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
           <div className="md:hidden p-3 border-t border-gray-200 sticky bottom-0 bg-gray-50">
                 <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-100"><LogOut size={16} /><span>Logout</span></button>
            </div>
        </aside>

        {/* Main Content Area (ChatView or Placeholder) */}
        <main className="flex-grow flex flex-col relative overflow-hidden bg-white md:ml-0 pt-16 md:pt-0"> {/* pt-16 for mobile header */}
          {selectedChat ? (
            <ChatView key={selectedChat.id} chat={selectedChat} onSendMessage={handleSendMessage} newMessage={newMessage} setNewMessage={setNewMessage} messagesEndRef={messagesEndRef} 
                      onBack={() => { setSelectedChat(null); if (window.innerWidth < 768) setIsMobileSidebarOpen(true); }} 
                      onOpenModal={openChatActionModal} />
          ) : (
            <>
              {/* Desktop placeholder (visible on md and up) */}
              <div className="hidden md:flex flex-col flex-grow items-center justify-center p-6 md:p-10 bg-white text-center">
                <MessageSquareText className="w-20 h-20 text-teal-300 mb-5" />
                <h2 className="text-2xl font-semibold text-gray-700 mb-1">Welcome, {user.firstName || user.username}!</h2>
                <p className="text-gray-500 mb-6 max-w-md">Select a conversation from the sidebar to view messages, or share your anonymous link to start receiving them.</p>
                {user.username && (
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 text-sm">
                      {user.email && <p><strong className="text-gray-600">Email:</strong> <span className="text-gray-700">{user.email}</span></p>}
                      <p><strong className="text-gray-600">Username:</strong> <span className="text-gray-700">{user.username}</span></p>
                      {user.role && <p><strong className="text-gray-600">Role:</strong> <span className="text-gray-700 capitalize">{user.role}</span></p>}
                  </div>
                )}
                {userError && !isLoadingChats && <p className="mt-4 text-red-500 text-sm">{userError}</p>}
              </div>
              {/* Mobile placeholder (visible on sm only when no chat is selected) */}
              <div className="md:hidden flex flex-col flex-grow items-center justify-center p-6 text-center bg-white"> {/* Removed pt-20 as main has pt-16 */}
                  <MessageSquareText className="w-16 h-16 text-teal-300 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-700 mb-1">Select a Chat</h2>
                  <p className="text-gray-500 text-sm">Open the menu <Menu size={16} className="inline-block align-middle"/> to choose a conversation.</p>
                  {userError && !isLoadingChats && <p className="mt-4 text-red-500 text-sm">{userError}</p>}
              </div>
            </>
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