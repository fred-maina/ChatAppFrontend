// app/chat/[username]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, UserPlus, MessageSquareText, AlertTriangle, Loader2, VenetianMask, Frown, BellDot } from 'lucide-react';
import LegalModal from '../../Components/LegalModal';
import TermsAndConditionsContent from '../../Components/TermsAndConditionsContent';
import { WebSocketMessagePayload, ChatMessage as AppChatMessage } from '../../types';

const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";
const NOTIFICATION_ICON_URL = "/favicon.ico";

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
};

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
};

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface DisplayMessage extends AppChatMessage {
  isReply?: boolean;
}

interface ApiHistoryMessage {
  id: string;
  text: string;
  senderType: 'anonymous' | 'self';
  timestamp: string;
  nickname?: string;
}

interface UsernameCheckResponse {
  success: boolean;
  exists: boolean;
  username?: string;
  message?: string;
}

const AnonHeader = ({ showCreateLink = true }: { showCreateLink?: boolean }) => (
  <header className="py-3 px-4 md:px-6 shadow-sm bg-white sticky top-0 z-40 flex-shrink-0">
    <div className="container mx-auto flex justify-between items-center">
      <Link href="/" className="flex items-center space-x-2 cursor-pointer">
        <MessageSquareText className="h-7 w-7 text-teal-500" />
        <span className="text-lg font-semibold text-gray-700 hidden sm:block">AnonMsg</span>
      </Link>
      {showCreateLink && (
        <Link
          href="/auth?view=signup"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2"
        >
          <UserPlus size={16} className="hidden sm:inline-block" />
          <span className="text-xs sm:text-sm">Create Your Chat</span>
        </Link>
      )}
    </div>
  </header>
);

interface UsernameModalProps {
  tempSenderDisplayName: string;
  setTempSenderDisplayName: (name: string) => void;
  handleSetUsername: (e?: FormEvent) => void;
  handleUseRandomName: () => void;
  recipientUsername: string;
}

const UsernameModalComponent: React.FC<UsernameModalProps> = ({
  tempSenderDisplayName,
  setTempSenderDisplayName,
  handleSetUsername,
  handleUseRandomName,
  recipientUsername
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-white p-5 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <VenetianMask size={22} className="mr-2 text-teal-500" /> Choose Your Alias
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Pick a temporary display name for this chat. This is how <span className="font-semibold text-teal-600">{recipientUsername}</span> will see your messages. This alias will be remembered for 24 hours on this browser.
      </p>
      <form onSubmit={handleSetUsername} className="space-y-3">
        <input
          type="text"
          value={tempSenderDisplayName}
          onChange={(e) => setTempSenderDisplayName(e.target.value)}
          placeholder="Enter an alias or use random"
          className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          maxLength={30}
          autoFocus
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleUseRandomName}
            className="w-full sm:w-auto flex-grow px-3 py-2 rounded-lg border border-teal-500 text-teal-600 font-medium hover:bg-teal-50 focus:outline-none transition-colors text-sm"
          >
            Use Random Name
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto flex-grow px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium focus:outline-none transition-colors text-sm"
          >
            Set Name & Chat
          </button>
        </div>
      </form>
    </div>
  </div>
);

const adjectives = ["Secret", "Curious", "Hidden", "Silent", "Witty", "Clever", "Ghostly", "Playful", "Brave", "Quick", "Phantom", "Anonymous"];
const nouns = ["Panda", "Fox", "Badger", "Owl", "Cat", "Wolf", "Spirit", "Ninja", "Shadow", "Specter", "Voyager", "Scribe"];
const getRandomName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;


export default function AnonymousChatPage() {
  const params = useParams();
  const initialRecipientUsername = typeof params.username === 'string' ? decodeURIComponent(params.username) : '';

  const [messageText, setMessageText] = useState('');
  const [tempSenderDisplayName, setTempSenderDisplayName] = useState('');
  const [finalSenderDisplayName, setFinalSenderDisplayName] = useState<string | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [displayedMessages, setDisplayedMessages] = useState<DisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_ANON_RECONNECT_ATTEMPTS = 10;
  const INITIAL_ANON_RECONNECT_DELAY_MS = 1000;

  const [anonSessionId, setAnonSessionId] = useState<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const [isUsernameValidating, setIsUsernameValidating] = useState(true);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);
  const [validatedRecipientUsername, setValidatedRecipientUsername] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = Notification.permission;
      setNotificationPermission(perm);
      if (perm === 'default' && finalSenderDisplayName) {
        setShowNotificationPrompt(true);
      }
    }
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.load();
  }, [finalSenderDisplayName]);

  const requestNotificationPermission = async () => {
    setShowNotificationPrompt(false);
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification("AnonMsg Notifications Enabled!", { body: "You'll now receive alerts for replies.", icon: NOTIFICATION_ICON_URL });
        } else {
            setPageError("Notification permission denied by you. You won't get desktop alerts for replies.");
        }
      } else if (Notification.permission === 'denied') {
          setPageError("Notifications are blocked. Please enable them in your browser settings to get reply alerts.");
      } else if (Notification.permission === 'granted') {
         new Notification("AnonMsg Notifications", { body: "Desktop alerts for new replies are active.", icon: NOTIFICATION_ICON_URL, silent: true });
      }
    } else {
      setPageError("This browser does not support desktop notifications.");
    }
  };

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.warn("Error playing notification sound:", error));
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, { body: body, icon: NOTIFICATION_ICON_URL, tag: `anonmsg-reply-${validatedRecipientUsername}-${anonSessionId}` });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [notificationPermission, validatedRecipientUsername, anonSessionId]);

  const openTermsModal = () => setIsLegalModalOpen(true);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (displayedMessages.length > 0) {
      setTimeout(() => { // Ensure DOM is updated before scrolling
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [displayedMessages]);

  // WebSocket connection logic
  const connectAnonWebSocket = useCallback((isReconnect: boolean = false) => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      console.log("Anon WS: Attempt skipped, already open or connecting.");
      return;
    }
    if (!usernameExists || !finalSenderDisplayName || !anonSessionId || !validatedRecipientUsername) {
      console.log("Anon WS: Attempt skipped, missing required params.");
      return;
    }

    setPageError(isReconnect ? `Reconnecting chat (attempt ${reconnectAttemptsRef.current})...` : "Connecting to chat...");
    
    const socketUrl = `${WEBSOCKET_BASE_URL}/ws/chat?anonSessionId=${anonSessionId}`;
    console.log("Anon WS: Connecting to:", socketUrl);
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('Anon WS: Connection established for session:', anonSessionId);
      setPageError(null);
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    socket.onmessage = (event) => {
      try {
        const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string);
        console.log("Anon WS: Received message:", messagePayload);
        if (messagePayload.type === "USER_TO_ANON" && messagePayload.to === anonSessionId) {
          const messageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date();
          const newDisplayMessage: DisplayMessage = {
            id: `reply-${messagePayload.timestamp || Date.now()}-${Math.random()}`,
            text: messagePayload.content ?? '',
            sender: validatedRecipientUsername, // The user who owns the dashboard replied
            timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            originalTimestamp: messageTimestamp.toISOString(),
            isReply: true,
          };
          setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()));
          playNotificationSound();
          if (document.hidden) {
            showBrowserNotification(`Reply from ${validatedRecipientUsername}`, messagePayload.content ?? "");
          }
        } else if (messagePayload.type === "ERROR") {
            setPageError(`Server error: ${messagePayload.content}`);
        } else if (messagePayload.type === "INFO") {
             console.log("Anon WS INFO:", messagePayload.content);
        }
      } catch (e) {
        console.error('Anon WS: Error processing incoming message:', e);
        setPageError("Received an invalid message from the server.");
      }
    };

    socket.onerror = (errorEvent) => {
      console.error('Anon WS: Error:', errorEvent);
      ws.current = null; 
      // scheduleAnonReconnect will set its own error message
      scheduleAnonReconnect(); // scheduleAnonReconnect is defined below and memoized
    };

    socket.onclose = (closeEvent) => {
      console.log('Anon WS: Connection closed:', closeEvent.code, closeEvent.reason);
      ws.current = null;
      if (!closeEvent.wasClean && closeEvent.code !== 1000) {
        // scheduleAnonReconnect will set its own error message
        scheduleAnonReconnect(); // scheduleAnonReconnect is defined below and memoized
      } else if (closeEvent.wasClean && closeEvent.code === 1000) {
        console.log("Anon WS: Closed cleanly. No reconnect.");
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername, playNotificationSound, showBrowserNotification, WEBSOCKET_BASE_URL]); // scheduleAnonReconnect removed from here

  const scheduleAnonReconnect = useCallback(() => {
    if (!usernameExists || !finalSenderDisplayName || !anonSessionId || !validatedRecipientUsername) {
        console.log("Anon WS: Cannot schedule reconnect, missing essential params.");
        return;
    }
    if (reconnectAttemptsRef.current >= MAX_ANON_RECONNECT_ATTEMPTS) {
        setPageError("Max reconnect attempts reached for chat. Please refresh the page.");
        return;
    }
    const delay = Math.min(INITIAL_ANON_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    setPageError(`Chat disconnected. Attempting to reconnect in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current})...`);

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
        connectAnonWebSocket(true); // Call the memoized connectAnonWebSocket
    }, delay);
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername, connectAnonWebSocket]); // connectAnonWebSocket is a dependency

  // Effect for initial WebSocket connection and cleanup
  useEffect(() => {
    if (usernameExists && finalSenderDisplayName && anonSessionId && validatedRecipientUsername) {
        // Only attempt to connect if not already open or connecting, or if it's closed.
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) { 
            connectAnonWebSocket();
        }
    }
    return () => { // Cleanup function
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log("Anon WS: Closing connection on unmount or dep change.");
            ws.current.close(1000, "Client unmounting or params changed");
        }
        ws.current = null; 
    };
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername, connectAnonWebSocket]);


  useEffect(() => {
    if (initialRecipientUsername) {
      setIsUsernameValidating(true); setPageError(null); setUsernameExists(null);
      fetch(`${API_BASE_URL}/api/auth/check-username/${encodeURIComponent(initialRecipientUsername)}`)
        .then(async (res) => {
          if (!res.ok) {
             const errorData = await res.json().catch(() => ({ message: "Error validating user." }));
            throw new Error(errorData.message || `Server error: ${res.status}`);
          }
          return res.json() as Promise<UsernameCheckResponse>;
        })
        .then((data) => {
          if (data.success && data.exists) {
            setUsernameExists(true);
            setValidatedRecipientUsername(data.username || initialRecipientUsername);
            let sessionIdValue = getCookie('anonSessionId');
            if (!sessionIdValue) {
              sessionIdValue = generateUUID();
              setCookie('anonSessionId', sessionIdValue, 30);
            }
            setAnonSessionId(sessionIdValue);
            if (sessionIdValue) {
              const nicknameCookieName = `anonSenderNickname_${sessionIdValue}_to_${data.username || initialRecipientUsername}`;
              const existingNickname = getCookie(nicknameCookieName);
              if (existingNickname) {
                setFinalSenderDisplayName(existingNickname);
                setTempSenderDisplayName(existingNickname);
                setIsUsernameModalOpen(false);
                if (Notification.permission === 'default') setShowNotificationPrompt(true);
              } else {
                setIsUsernameModalOpen(true);
                if (!tempSenderDisplayName) setTempSenderDisplayName(getRandomName());
              }
            }
          } else if (data.success && !data.exists) {
            setUsernameExists(false);
            setPageError(`User "${initialRecipientUsername}" not found. The link may be broken or the user may not exist.`);
            setIsUsernameModalOpen(false);
          } else {
            throw new Error(data.message || "Invalid response from server while checking username.");
          }
        })
        .catch((err) => {
          console.error("Error validating username:", err);
          setPageError(`Could not verify user: ${(err as Error).message}. Please try again later.`);
          setUsernameExists(false); setIsUsernameModalOpen(false);
        })
        .finally(() => setIsUsernameValidating(false));
    } else {
      setPageError("Recipient username is missing from the URL.");
      setIsUsernameValidating(false); setUsernameExists(false); setIsUsernameModalOpen(false);
    }
  }, [initialRecipientUsername]); // tempSenderDisplayName removed as it caused re-validation

  useEffect(() => {
    if (usernameExists && finalSenderDisplayName && anonSessionId && validatedRecipientUsername) {
      setIsHistoryLoading(true); setPageError(null);
      fetch(`${API_BASE_URL}/api/chat/session_history?sessionId=${encodeURIComponent(anonSessionId)}&recipient=${encodeURIComponent(validatedRecipientUsername)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to parse error from session_history" }));
            throw new Error(errorData.message || `Failed to fetch chat history. Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && Array.isArray(data.messages)) {
            const fetchedHistoryMessages: DisplayMessage[] = data.messages.map((apiMsg: ApiHistoryMessage): DisplayMessage => {
              const isReplyFromRecipient = apiMsg.senderType === 'self';
              const messageTimestamp = apiMsg.timestamp ? new Date(apiMsg.timestamp) : new Date();
              return {
                id: apiMsg.id || `hist-${messageTimestamp.toISOString()}-${Math.random()}`,
                text: apiMsg.text,
                sender: isReplyFromRecipient ? validatedRecipientUsername : (apiMsg.nickname || finalSenderDisplayName || "Anonymous"),
                timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                originalTimestamp: apiMsg.timestamp,
                isReply: isReplyFromRecipient,
                nickname: !isReplyFromRecipient ? (apiMsg.nickname || finalSenderDisplayName) : undefined,
              };
            });
            setDisplayedMessages(prevMessages => {
              const messageMap = new Map<string, DisplayMessage>();
              prevMessages.forEach(msg => messageMap.set(msg.id, msg));
              fetchedHistoryMessages.forEach(msg => messageMap.set(msg.id, msg));
              return Array.from(messageMap.values()).sort((a, b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime());
            });
          } else if (!data.success && data.messages && data.messages.length === 0) {
            // No action, history is empty.
          } else {
            throw new Error(data.message || "Invalid data format for chat history.");
          }
        })
        .catch(err => {
          console.error("Error fetching chat history:", err);
          setPageError(`Could not load previous messages: ${(err as Error).message}.`);
        }).finally(() => setIsHistoryLoading(false));
    }
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (messageText.trim() !== '' && !isLoading ) {
        const confirmationMessage = "You have an unsent message. Are you sure you want to leave?";
        event.preventDefault(); event.returnValue = confirmationMessage; return confirmationMessage;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messageText, isLoading]);

  const handleSetUsernameInternal = (e?: FormEvent) => {
    e?.preventDefault();
    if (!validatedRecipientUsername) return;
    let nameToSet = tempSenderDisplayName.trim();
    if (nameToSet === '') nameToSet = getRandomName();
    setFinalSenderDisplayName(nameToSet);
    if (anonSessionId && validatedRecipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(nameToSet), 1);
    }
    setIsUsernameModalOpen(false); setPageError(null);
    if (Notification.permission === 'default') setShowNotificationPrompt(true);
  };

  const handleUseRandomNameInternal = () => {
     if (!validatedRecipientUsername) return;
    const randomName = getRandomName();
    setTempSenderDisplayName(randomName); setFinalSenderDisplayName(randomName);
    if (anonSessionId && validatedRecipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(randomName), 1);
    }
    setIsUsernameModalOpen(false); setPageError(null);
    if (Notification.permission === 'default') setShowNotificationPrompt(true);
  };

  const handleSubmitMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) { setPageError("Message cannot be empty."); return; }
    if (!validatedRecipientUsername) { setPageError("Cannot send: recipient invalid."); return; }
    if (!finalSenderDisplayName) { setPageError("Please set display name first."); setIsUsernameModalOpen(true); return; }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setPageError("Not connected to chat. Please wait or refresh. Attempting to reconnect...");
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING) {
        connectAnonWebSocket(); // Attempt to reconnect if closed or closing
      }
      return;
    }

    setIsLoading(true); setPageError(null);
    const currentMessageTimestamp = new Date();
    const messagePayload: WebSocketMessagePayload = {
      type: "ANON_TO_USER", from: anonSessionId || "unknown_anon_session", to: validatedRecipientUsername,
      content: messageText.trim(), nickname: finalSenderDisplayName, timestamp: currentMessageTimestamp.toISOString(),
    };

    try {
      ws.current.send(JSON.stringify(messagePayload));
      const newMessageId = `sent-${currentMessageTimestamp.toISOString()}-${Math.random()}`;
      const newDisplayMessage: DisplayMessage = {
        id: newMessageId, text: messageText.trim(), sender: finalSenderDisplayName,
        timestamp: currentMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalTimestamp: currentMessageTimestamp.toISOString(), isReply: false,
      };
      setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()));
      setMessageText('');
    } catch (err: unknown) {
      console.error("Error sending message via WebSocket:", err);
      setPageError(err instanceof Error ? (err.message || 'Unexpected error sending.') : 'Unexpected error sending.');
    } finally {
      setIsLoading(false);
    }
  };

  const AdvertPanel = () => (
    <div className="w-full bg-teal-600 text-white shadow-lg rounded-xl p-3 sm:p-4 text-center flex-shrink-0">
        <h2 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Want your own anonymous chat?</h2>
        <p className="text-teal-100 mb-2 sm:mb-3 text-xs sm:text-sm hidden sm:block">
           Create a free AnonMsg account to get a unique link. Share it anywhere!
        </p>
        <Link
            href="/auth?view=signup" target="_blank" rel="noopener noreferrer"
            className="bg-white text-teal-600 font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-lg text-xs sm:text-sm transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-opacity-75"
        > Get Your Free Link </Link>
         <p className="text-xs text-teal-200 mt-2 sm:hidden"> Fast, free, and fun. </p>
    </div>
  );

  if (isUsernameValidating) {
    return (
      <div className="h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader showCreateLink={false} />
        <main className="flex-grow container mx-auto py-16 px-4 flex flex-col items-center justify-center text-center">
          <Loader2 size={40} className="animate-spin text-teal-500 mb-3" />
          <p className="text-base text-gray-600">Verifying user <span className="font-semibold">{initialRecipientUsername}</span>...</p>
        </main>
         <footer className="bg-gray-800 text-gray-400 py-6 px-4 md:px-6 text-center text-xs mt-auto flex-shrink-0">
            <div className="container mx-auto"> <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> </div>
        </footer>
      </div>
    );
  }

  if (usernameExists === false) {
    return (
      <div className="h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader />
        <main className="flex-grow container mx-auto py-12 px-4 flex flex-col items-center justify-center text-center">
          <Frown size={56} className="text-yellow-500 mb-5" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-2 max-w-md text-sm"> The user <strong className="text-teal-600">{initialRecipientUsername}</strong> could not be found. </p>
          <p className="text-gray-500 mb-6 max-w-md text-sm"> {pageError || "The link might be broken, or the user may have changed their username or deleted their account."} </p>
          <Link href="/" passHref> <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"> Back to Homepage </button> </Link>
        </main>
         <footer className="bg-gray-800 text-gray-400 py-6 px-4 md:px-6 text-center text-xs mt-auto flex-shrink-0">
            <div className="container mx-auto"> <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> </div>
        </footer>
      </div>
    );
  }

  if (isUsernameModalOpen && usernameExists && !finalSenderDisplayName) { // Ensure modal only shows if final name not set
    return (
      <>
      <div className="h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader />
         <main className="flex-grow container mx-auto py-8 px-4 text-center">
            <p className="text-base text-gray-600 p-8">Loading chat setup...</p>
        </main>
        <UsernameModalComponent
            tempSenderDisplayName={tempSenderDisplayName} setTempSenderDisplayName={setTempSenderDisplayName}
            handleSetUsername={handleSetUsernameInternal} handleUseRandomName={handleUseRandomNameInternal}
            recipientUsername={validatedRecipientUsername}
        />
        <footer className="bg-gray-800 text-gray-400 py-6 px-4 md:px-6 text-center text-xs mt-auto flex-shrink-0">
            <div className="container mx-auto">
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
                 <p className="mt-1">Remember to be respectful. Do not use this service for harassment.</p>
            </div>
        </footer>
      </div>
      </>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif] overflow-hidden">
        <AnonHeader />
        {isUsernameModalOpen && usernameExists && !finalSenderDisplayName && ( // Redundant check, but safe
            <UsernameModalComponent
                tempSenderDisplayName={tempSenderDisplayName} setTempSenderDisplayName={setTempSenderDisplayName}
                handleSetUsername={handleSetUsernameInternal} handleUseRandomName={handleUseRandomNameInternal}
                recipientUsername={validatedRecipientUsername} />
        )}

        <main className="flex-grow container mx-auto flex flex-col px-0 sm:px-4 pt-2 sm:pt-4 pb-2 md:px-6 relative overflow-hidden">
          {pageError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-md shadow-md mx-4 sm:mx-0 mb-2 sm:mb-3 flex items-center text-xs sm:text-sm flex-shrink-0" role="alert">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> <span>{pageError}</span>
              <button onClick={() => setPageError(null)} className="ml-auto -mr-1 -my-1 p-1 sm:p-1.5 text-red-500 hover:bg-red-200 rounded-md"> <svg className="fill-current h-4 w-4 sm:h-5 sm:w-5" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.697l-2.651 3.152a1.2 1.2 0 1 1-1.697-1.697L8.303 10 5.152 7.348a1.2 1.2 0 1 1 1.697-1.697L10 8.303l2.651-3.152a1.2 1.2 0 1 1 1.697 1.697L11.697 10l3.152 2.651a1.2 1.2 0 0 1 0 1.697z"/></svg> </button>
            </div>
          )}
          {showNotificationPrompt && notificationPermission === 'default' && (
            <div className="bg-teal-50 border border-teal-300 text-teal-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow-md mx-4 sm:mx-0 mb-2 sm:mb-3 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm flex-shrink-0">
                <div className="flex items-center mb-1 sm:mb-0"> <BellDot size={18} className="mr-2 text-teal-600"/> <div> <p className="font-semibold text-xs sm:text-sm">Get Reply Alerts!</p> <p className="text-xs hidden sm:block">Enable browser notifications for replies from {validatedRecipientUsername}.</p> </div> </div>
                <div className="flex space-x-2 mt-1 sm:mt-0"> <button onClick={requestNotificationPermission} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium py-1 px-2 sm:py-1.5 sm:px-3 rounded-md transition-colors"> Enable </button> <button onClick={() => setShowNotificationPrompt(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium py-1 px-2 sm:py-1.5 sm:px-3 rounded-md transition-colors"> Later </button> </div>
            </div>
          )}
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 text-center mb-2 sm:mb-3 px-4 sm:px-0 flex-shrink-0"> Chatting with <span className="text-teal-600">{validatedRecipientUsername}</span> </h1>
          <div className="flex-grow flex flex-col bg-white rounded-t-xl sm:rounded-xl shadow-xl overflow-hidden border border-gray-200 mx-0 sm:mx-0">
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-2 sm:px-3 py-2 sm:py-3 space-y-2 sm:space-y-3">
              {isHistoryLoading && ( <div className="flex justify-center items-center h-full text-teal-500"> <Loader2 className="animate-spin mr-2" size={20} /> Loading messages... </div> )}
              {!isHistoryLoading && displayedMessages.length === 0 && (
                <div className="text-center text-gray-500 py-10 flex flex-col items-center justify-center h-full">
                  <MessageSquareText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-md font-medium">No messages yet.</p>
                  <p className="text-xs sm:text-sm">Send the first anonymous message to <span className="font-semibold">{validatedRecipientUsername}</span>!</p>
                  <p className="text-xs mt-1 sm:mt-2">Your alias: <span className="font-semibold text-teal-600">{finalSenderDisplayName}</span></p>
                </div>
              )}
              {displayedMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isReply ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-md rounded-2xl ${ msg.isReply ? 'bg-gray-200 text-gray-800 rounded-bl-md' : 'bg-teal-500 text-white rounded-br-md' }`}>
                    {!msg.isReply && ( <div className="font-semibold text-xs mb-0.5 sm:mb-1 opacity-90"> {msg.nickname || finalSenderDisplayName} </div> )}
                    {msg.isReply && ( <div className="font-semibold text-xs mb-0.5 sm:mb-1 text-gray-600"> {validatedRecipientUsername} </div> )}
                    <p className="text-sm break-words leading-snug sm:leading-relaxed">{msg.text}</p>
                    <div className={`text-right text-[10px] opacity-70 mt-1 sm:mt-1.5 ${msg.isReply ? 'text-gray-500' : 'text-teal-100'}`}> {msg.timestamp} </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmitMessage} className="flex-shrink-0 bg-gray-50 p-2 sm:p-3 md:p-4 border-t border-gray-200 flex items-center space-x-1 sm:space-x-2">
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your anonymous message..."
                className="flex-grow border border-gray-300 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 mr-1 sm:mr-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors text-gray-700 text-sm shadow-sm"
                disabled={isLoading || !finalSenderDisplayName || !usernameExists} maxLength={500} />
                <button type="submit"
                className="bg-teal-500 hover:bg-teal-600 text-white p-2.5 sm:p-3 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={isLoading || !messageText.trim() || !finalSenderDisplayName || !usernameExists}>
                {isLoading ? ( <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5" /> ) : ( <Send className="h-4 w-4 sm:h-5 sm:w-5" /> )}
                </button>
            </form>
          </div>
          <div className="mt-3 sm:mt-4 mx-4 sm:mx-0 flex-shrink-0"> <AdvertPanel /> </div>
        </main>
        <footer className="bg-gray-800 text-gray-400 py-3 sm:py-5 px-4 md:px-6 text-center text-xs mt-auto flex-shrink-0">
          <div className="container mx-auto">
            <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
            <p className="mt-0.5 sm:mt-1">Remember to be respectful. Do not use this service for harassment.</p>
            <button onClick={openTermsModal} className="text-teal-400 hover:underline mt-1 sm:mt-1.5 text-xs"> Terms and Conditions </button>
          </div>
        </footer>
        <LegalModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} title="Terms and Conditions" content={<TermsAndConditionsContent/>} />
      </div>
    </>
  );
}