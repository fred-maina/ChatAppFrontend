// app/chat/[username]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react'; // Added useCallback
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


const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL
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
  <header className="py-4 px-6 md:px-10 shadow-sm bg-white sticky top-0 z-40">
    <div className="container mx-auto flex justify-between items-center">
      <Link href="/" className="flex items-center space-x-2 cursor-pointer">
        <MessageSquareText className="h-8 w-8 text-teal-500" />
        <span className="text-xl font-semibold text-gray-700 hidden sm:block">AnonMsg</span>
      </Link>
      {showCreateLink && (
        <Link
          href="/auth?view=signup"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-5 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 text-sm"
        >
          <UserPlus size={18} />
          <span>Create Your Own Chat</span>
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
    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <VenetianMask size={24} className="mr-2 text-teal-500" /> Choose Your Alias
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Pick a temporary display name for this chat. This is how <span className="font-semibold text-teal-600">{recipientUsername}</span> will see your messages. This alias will be remembered for 24 hours on this browser.
      </p>
      <form onSubmit={handleSetUsername} className="space-y-4">
        <input
          type="text"
          value={tempSenderDisplayName}
          onChange={(e) => setTempSenderDisplayName(e.target.value)}
          placeholder="Enter an alias or use random"
          className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          maxLength={30}
          autoFocus
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleUseRandomName}
            className="w-full sm:w-auto flex-grow px-4 py-2.5 rounded-lg border border-teal-500 text-teal-600 font-medium hover:bg-teal-50 focus:outline-none transition-colors text-sm"
          >
            Use Random Name
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto flex-grow px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium focus:outline-none transition-colors text-sm"
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
  const [anonSessionId, setAnonSessionId] = useState<string | null>(null);

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const [isUsernameValidating, setIsUsernameValidating] = useState(true);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);
  const [validatedRecipientUsername, setValidatedRecipientUsername] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Initialize notification permission and audio
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.load();
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification("AnonMsg Notifications Enabled!", {
            body: "You'll now receive alerts for replies.",
            icon: NOTIFICATION_ICON_URL
          });
        } else {
            setPageError("Notification permission denied. You won't get desktop alerts for replies.");
        }
      } else if (Notification.permission === 'denied') {
          setPageError("Notifications are blocked. Please enable them in your browser settings to get reply alerts.");
      } else if (Notification.permission === 'granted') {
         new Notification("AnonMsg Notifications", {
            body: "Desktop alerts for new replies are active.",
            icon: NOTIFICATION_ICON_URL,
            silent: true
        });
      }
    } else {
      setPageError("This browser does not support desktop notifications.");
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.warn("Error playing notification sound:", error));
    }
  };

  // Wrapped showBrowserNotification in useCallback
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: NOTIFICATION_ICON_URL,
        tag: `anonmsg-reply-${validatedRecipientUsername}-${anonSessionId}`
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [notificationPermission, validatedRecipientUsername, anonSessionId]); // Dependencies for useCallback

  const openTermsModal = () => {
    setIsLegalModalOpen(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (initialRecipientUsername) {
      setIsUsernameValidating(true);
      setPageError(null);
      setUsernameExists(null);

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
              } else {
                setIsUsernameModalOpen(true);
                if (!tempSenderDisplayName) {
                    setTempSenderDisplayName(getRandomName());
                }
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
          setUsernameExists(false);
          setIsUsernameModalOpen(false);
        })
        .finally(() => {
          setIsUsernameValidating(false);
        });
    } else {
      setPageError("Recipient username is missing from the URL.");
      setIsUsernameValidating(false);
      setUsernameExists(false);
      setIsUsernameModalOpen(false);
    }
  }, [initialRecipientUsername,tempSenderDisplayName]);

  useEffect(() => {
    if (usernameExists && finalSenderDisplayName && anonSessionId && validatedRecipientUsername) {
      setIsHistoryLoading(true);
      setPageError(null);
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
              fetchedHistoryMessages.forEach(msg => messageMap.set(msg.id, msg));
              prevMessages.forEach(msg => messageMap.set(msg.id, msg));

              return Array.from(messageMap.values()).sort((a, b) =>
                new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()
              );
            });
            if (fetchedHistoryMessages.length > 0) {
              setTimeout(scrollToBottom, 0);
            }
          } else if (data.success && data.messages.length === 0) {
             setDisplayedMessages([]);
          }
          else {
            throw new Error(data.message || "Invalid data format for chat history.");
          }
        })
        .catch(err => {
          console.error("Error fetching chat history:", err);
          setPageError(`Could not load previous messages: ${(err as Error).message}.`);
        }).finally(() => setIsHistoryLoading(false));
    }
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername]);


  // Effect for WebSocket connection
  useEffect(() => {
    if (!usernameExists || !finalSenderDisplayName || !anonSessionId || !validatedRecipientUsername) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    const socketUrl = `${WEBSOCKET_BASE_URL}/ws/chat?anonSessionId=${anonSessionId}`;
    console.log("Connecting to Anon WebSocket:", socketUrl, "for session:", anonSessionId);
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('Anon WebSocket connection established for session:', anonSessionId);
      setPageError(null);
    }
    socket.onmessage = (event) => {
      try {
        const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string);
        console.log("Anon received message:", messagePayload);
        if (messagePayload.type === "USER_TO_ANON" && messagePayload.to === anonSessionId) {
          const messageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date();
          const newDisplayMessage: DisplayMessage = {
            id: `reply-${messagePayload.timestamp || Date.now()}-${Math.random()}`,
            text: messagePayload.content ?? '', // Add this part,
            sender: validatedRecipientUsername,
            timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            originalTimestamp: messageTimestamp.toISOString(),
            isReply: true,
          };
          setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()));
          setTimeout(scrollToBottom, 0);

          // --- Notification and Sound ---
          playNotificationSound();
          if (document.hidden) {
            showBrowserNotification(
              `Reply from ${validatedRecipientUsername}`,
              messagePayload.content ?? ""
            );
          }
          // --- End Notification and Sound ---

        } else if (messagePayload.type === "ERROR") {
            setPageError(`Server error: ${messagePayload.content}`);
        } else if (messagePayload.type === "INFO") {
             console.log("WebSocket INFO:", messagePayload.content);
        }
      } catch (e) {
        console.error('Error processing incoming message:', e);
        setPageError("Received an invalid message from the server.");
      }
    };
    socket.onerror = (errorEvent) => {
      console.error('Anon WebSocket error:', errorEvent);
      setPageError('Chat connection error. Please refresh. If persists, service might be unavailable.');
      ws.current = null;
    };
    socket.onclose = (closeEvent) => {
      console.log('Anon WebSocket connection closed:', closeEvent.code, closeEvent.reason);
      ws.current = null;
    };
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, "Client navigating or unmounting");
      }
      ws.current = null;
    };
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername, showBrowserNotification]);


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
    if (nameToSet === '') {
      nameToSet = getRandomName();
    }
    setFinalSenderDisplayName(nameToSet);
    if (anonSessionId && validatedRecipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(nameToSet), 1);
    }
    setIsUsernameModalOpen(false);
    setPageError(null);
  };

  const handleUseRandomNameInternal = () => {
     if (!validatedRecipientUsername) return;
    const randomName = getRandomName();
    setTempSenderDisplayName(randomName);
    setFinalSenderDisplayName(randomName);
    if (anonSessionId && validatedRecipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(randomName), 1);
    }
    setIsUsernameModalOpen(false);
    setPageError(null);
  };

  const handleSubmitMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) { setPageError("Message cannot be empty."); return; }
    if (!validatedRecipientUsername) { setPageError("Cannot send message: recipient is not defined or invalid."); return; }
    if (!finalSenderDisplayName) { setPageError("Please set a temporary display name first."); setIsUsernameModalOpen(true); return; }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setPageError("Not connected to chat server. Please wait or refresh. Retrying connection...");
      return;
    }

    setIsLoading(true); setPageError(null);
    const currentMessageTimestamp = new Date();

    const messagePayload: WebSocketMessagePayload = {
      type: "ANON_TO_USER",
      from: anonSessionId || "unknown_anon_session",
      to: validatedRecipientUsername,
      content: messageText.trim(),
      nickname: finalSenderDisplayName,
      timestamp: currentMessageTimestamp.toISOString(),
    };

    try {
      ws.current.send(JSON.stringify(messagePayload));
      const newMessageId = `sent-${currentMessageTimestamp.toISOString()}-${Math.random()}`;
      const newDisplayMessage: DisplayMessage = {
        id: newMessageId,
        text: messageText.trim(),
        sender: finalSenderDisplayName,
        timestamp: currentMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalTimestamp: currentMessageTimestamp.toISOString(),
        isReply: false,
      };
      setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()));
      setMessageText('');
      setTimeout(scrollToBottom, 0);
    } catch (err: unknown) { // Changed 'any' to 'unknown'
      console.error("Error sending message via WebSocket:", err);
      // Now, you must assert the type of 'err' before accessing its properties
      if (err instanceof Error) {
        setPageError(err.message || 'An unexpected error occurred while sending.');
      } else {
        setPageError('An unexpected error occurred while sending.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const AdvertPanel = () => (
    <div className="w-full bg-teal-600 text-white shadow-xl rounded-2xl p-6 md:p-8 text-center">
        <UserPlus className="w-12 h-12 text-teal-200 mx-auto mb-3" />
        <h2 className="text-xl md:text-2xl font-semibold mb-2">Want to Receive Your Own Anonymous Messages?</h2>
        <p className="text-teal-100 mb-6 text-sm md:text-base">
        Create a free AnonMsg account to get your unique chat link. Share it with friends, on social media, or anywhere to see what people *really* think!
        </p>
        <Link
            href="/auth?view=signup"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-teal-600 font-bold py-2.5 px-8 rounded-lg text-base transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-opacity-75"
        >
            Create Your Free Account
        </Link>
        <p className="text-xs text-teal-200 mt-4">
        It&apos;s fast, easy, and opens up a world of honest conversations.
        </p>
    </div>
  );


  if (isUsernameValidating) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader showCreateLink={false} />
        <main className="flex-grow container mx-auto py-20 px-4 flex flex-col items-center justify-center text-center">
          <Loader2 size={48} className="animate-spin text-teal-500 mb-4" />
          <p className="text-lg text-gray-600">Verifying user <span className="font-semibold">{initialRecipientUsername}</span>...</p>
        </main>
         <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto">
            <div className="container mx-auto">
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
            </div>
        </footer>
      </div>
    );
  }

  if (usernameExists === false) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader />
        <main className="flex-grow container mx-auto py-16 px-4 flex flex-col items-center justify-center text-center">
          <Frown size={64} className="text-yellow-500 mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-3">User Not Found</h1>
          <p className="text-gray-600 mb-2 max-w-md">
            The user <strong className="text-teal-600">{initialRecipientUsername}</strong> could not be found.
          </p>
          <p className="text-gray-500 mb-8 max-w-md">
            {pageError || "The link might be broken, or the user may have changed their username or deleted their account."}
          </p>
          <Link href="/" passHref>
            <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">
              Back to Homepage
            </button>
          </Link>
        </main>
         <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto">
            <div className="container mx-auto">
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
            </div>
        </footer>
      </div>
    );
  }

  if (isUsernameModalOpen && usernameExists) {
    return (
      <>
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader />
         <main className="flex-grow container mx-auto py-8 px-4 text-center">
            <p className="text-lg text-gray-600 p-10">Loading chat setup...</p>
        </main>
        <UsernameModalComponent
            tempSenderDisplayName={tempSenderDisplayName}
            setTempSenderDisplayName={setTempSenderDisplayName}
            handleSetUsername={handleSetUsernameInternal}
            handleUseRandomName={handleUseRandomNameInternal}
            recipientUsername={validatedRecipientUsername}
        />
        <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto">
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
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
        <AnonHeader />
        {isUsernameModalOpen && usernameExists && !finalSenderDisplayName && (
            <UsernameModalComponent
                tempSenderDisplayName={tempSenderDisplayName}
                setTempSenderDisplayName={setTempSenderDisplayName}
                handleSetUsername={handleSetUsernameInternal}
                handleUseRandomName={handleUseRandomNameInternal}
                recipientUsername={validatedRecipientUsername}
            />
        )}

        <main className="flex-grow container mx-auto flex flex-col px-4 pt-4 pb-20 md:px-6 relative">
          {pageError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex items-center text-sm" role="alert">
              <AlertTriangle className="h-5 w-5 mr-3" />
              <span>{pageError}</span>
              <button onClick={() => setPageError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-500">
                <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.697l-2.651 3.152a1.2 1.2 0 1 1-1.697-1.697L8.303 10 5.152 7.348a1.2 1.2 0 1 1 1.697-1.697L10 8.303l2.651-3.152a1.2 1.2 0 1 1 1.697 1.697L11.697 10l3.152 2.651a1.2 1.2 0 0 1 0 1.697z"/></svg>
              </button>
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-6">
            Chatting with <span className="text-teal-600">{validatedRecipientUsername}</span>
          </h1>

          <div className="flex-grow flex flex-col bg-white rounded-lg shadow-xl p-4 md:p-6 mb-6 overflow-hidden">
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-2 py-1">
              {isHistoryLoading && (
                <div className="flex justify-center items-center h-20 text-teal-500">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading messages...
                </div>
              )}
              {!isHistoryLoading && displayedMessages.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  <MessageSquareText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p>No messages yet. Send the first anonymous message!</p>
                  <p className="text-sm mt-2">Your alias: <span className="font-semibold text-teal-600">{finalSenderDisplayName}</span></p>
                  {notificationPermission !== 'granted' && (
                    <button
                        onClick={requestNotificationPermission}
                        className="mt-4 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center mx-auto transition-colors"
                    >
                        <BellDot size={16} className="mr-2" /> Enable Reply Notifications
                    </button>
                  )}
                </div>
              )}

              {displayedMessages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex mb-3 ${msg.isReply ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl text-white shadow ${
                      msg.isReply
                        ? 'bg-gray-700 rounded-bl-none'
                        : 'bg-teal-500 rounded-br-none'
                    }`}
                  >
                    <div className="font-semibold text-xs mb-1">
                      {msg.isReply ? validatedRecipientUsername : (msg.nickname || finalSenderDisplayName)}
                    </div>
                    <p className="text-sm break-words">{msg.text}</p>
                    <div className="text-right text-xs opacity-80 mt-1">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmitMessage} className="flex-shrink-0 bg-white p-4 rounded-lg shadow-md flex items-center">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your anonymous message..."
              className="flex-grow border border-gray-300 rounded-full px-4 py-2 mr-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors text-gray-700"
              disabled={isLoading || !finalSenderDisplayName || !usernameExists}
              maxLength={500}
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !messageText.trim() || !finalSenderDisplayName || !usernameExists}
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>

          <div className="mt-8">
            <AdvertPanel />
          </div>
        </main>

        <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto">
          <div className="container mx-auto">
            <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
            <p className="mt-1">Remember to be respectful. Do not use this service for harassment.</p>
            <button onClick={openTermsModal} className="text-teal-400 hover:underline mt-2">
              Terms and Conditions
            </button>
          </div>
        </footer>

        <LegalModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          title="Terms and Conditions"
          content={<TermsAndConditionsContent/>}
        />
      </div>
    </>
  );
}