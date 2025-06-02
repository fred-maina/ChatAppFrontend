// app/chat/[username]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, UserPlus, MessageSquareText, AlertTriangle, CheckCircle, Loader2, X, VenetianMask, Frown, BellDot } from 'lucide-react'; // Added BellDot
import LegalModal from '../../Components/LegalModal'; ///page.tsx]
import TermsAndConditionsContent from '../../Components/TermsAndConditionsContent'; ///page.tsx]
import { WebSocketMessagePayload, ChatMessage as AppChatMessage } from '../../types'; ///page.tsx]

const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3"; // Path to your sound file
const NOTIFICATION_ICON_URL = "/favicon.ico"; // Path to your notification icon


// ... (generateUUID, setCookie, getCookie - existing code)/page.tsx]
function generateUUID() { ///page.tsx]
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { ///page.tsx]
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); ///page.tsx]
    return v.toString(16); ///page.tsx]
  });
}

const setCookie = (name: string, value: string, days: number) => { ///page.tsx]
  let expires = ""; ///page.tsx]
  if (days) { ///page.tsx]
    const date = new Date(); ///page.tsx]
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); ///page.tsx]
    expires = "; expires=" + date.toUTCString(); ///page.tsx]
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax"; ///page.tsx]
};

const getCookie = (name: string): string | null => { ///page.tsx]
  const value = `; ${document.cookie}`; ///page.tsx]
  const parts = value.split(`; ${name}=`); ///page.tsx]
  if (parts.length === 2) { ///page.tsx]
    const cookieValue = parts.pop()?.split(';').shift(); ///page.tsx]
    return cookieValue ? decodeURIComponent(cookieValue) : null; ///page.tsx]
  }
  return null; ///page.tsx]
};


const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL ///page.tsx]
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL; ///page.tsx]

interface DisplayMessage extends AppChatMessage { ///page.tsx]
  isReply?: boolean; ///page.tsx]
}

interface ApiHistoryMessage { ///page.tsx]
  id: string; ///page.tsx]
  text: string; ///page.tsx]
  senderType: 'anonymous' | 'self'; ///page.tsx]
  timestamp: string; ///page.tsx]
  nickname?: string; ///page.tsx]
}

interface UsernameCheckResponse { ///page.tsx]
  success: boolean; ///page.tsx]
  exists: boolean; ///page.tsx]
  username?: string; ///page.tsx]
  message?: string; ///page.tsx]
}

// ... (AnonHeader, UsernameModalComponent, adjectives, nouns, getRandomName - existing code)/page.tsx]
const AnonHeader = ({ showCreateLink = true }: { showCreateLink?: boolean }) => ( ///page.tsx]
  <header className="py-4 px-6 md:px-10 shadow-sm bg-white sticky top-0 z-40"> {/*/page.tsx] */}
    <div className="container mx-auto flex justify-between items-center"> {/*/page.tsx] */}
      <Link href="/" className="flex items-center space-x-2 cursor-pointer"> {/*/page.tsx] */}
        <MessageSquareText className="h-8 w-8 text-teal-500" /> {/*/page.tsx] */}
        <span className="text-xl font-semibold text-gray-700 hidden sm:block">AnonMsg</span> {/*/page.tsx] */}
      </Link>
      {showCreateLink && ( ///page.tsx]
        <Link
          href="/auth?view=signup"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-5 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 text-sm"
        >
          <UserPlus size={18} /> {/*/page.tsx] */}
          <span>Create Your Own Chat</span>
        </Link>
      )}
    </div>
  </header>
);

interface UsernameModalProps { ///page.tsx]
  tempSenderDisplayName: string; ///page.tsx]
  setTempSenderDisplayName: (name: string) => void; ///page.tsx]
  handleSetUsername: (e?: FormEvent) => void; ///page.tsx]
  handleUseRandomName: () => void; ///page.tsx]
  recipientUsername: string; ///page.tsx]
}

const UsernameModalComponent: React.FC<UsernameModalProps> = ({ ///page.tsx]
  tempSenderDisplayName, ///page.tsx]
  setTempSenderDisplayName, ///page.tsx]
  handleSetUsername, ///page.tsx]
  handleUseRandomName, ///page.tsx]
  recipientUsername ///page.tsx]
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"> {/*/page.tsx] */}
    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all"> {/*/page.tsx] */}
      <div className="flex items-start justify-between mb-5"> {/*/page.tsx] */}
        <h3 className="text-xl font-semibold text-gray-800 flex items-center"> {/*/page.tsx] */}
          <VenetianMask size={24} className="mr-2 text-teal-500" /> Choose Your Alias {/*/page.tsx] */}
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-4"> {/*/page.tsx] */}
        Pick a temporary display name for this chat. This is how <span className="font-semibold text-teal-600">{recipientUsername}</span> will see your messages. This alias will be remembered for 24 hours on this browser. {/*/page.tsx] */}
      </p>
      <form onSubmit={handleSetUsername} className="space-y-4"> {/*/page.tsx] */}
        <input
          type="text"
          value={tempSenderDisplayName}
          onChange={(e) => setTempSenderDisplayName(e.target.value)}
          placeholder="Enter an alias or use random"
          className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          maxLength={30}
          autoFocus
        /> {/*/page.tsx] */}
        <div className="flex flex-col sm:flex-row gap-2"> {/*/page.tsx] */}
          <button
            type="button"
            onClick={handleUseRandomName}
            className="w-full sm:w-auto flex-grow px-4 py-2.5 rounded-lg border border-teal-500 text-teal-600 font-medium hover:bg-teal-50 focus:outline-none transition-colors text-sm"
          >
            Use Random Name
          </button> {/*/page.tsx] */}
          <button
            type="submit"
            className="w-full sm:w-auto flex-grow px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium focus:outline-none transition-colors text-sm"
          >
            Set Name & Chat
          </button> {/*/page.tsx] */}
        </div>
      </form>
    </div>
  </div>
);

const adjectives = ["Secret", "Curious", "Hidden", "Silent", "Witty", "Clever", "Ghostly", "Playful", "Brave", "Quick", "Phantom", "Anonymous"]; ///page.tsx]
const nouns = ["Panda", "Fox", "Badger", "Owl", "Cat", "Wolf", "Spirit", "Ninja", "Shadow", "Specter", "Voyager", "Scribe"]; ///page.tsx]
const getRandomName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`; ///page.tsx]


export default function AnonymousChatPage() {
  const params = useParams(); ///page.tsx]
  const router = useRouter(); ///page.tsx]
  const initialRecipientUsername = typeof params.username === 'string' ? decodeURIComponent(params.username) : ''; ///page.tsx]

  const [messageText, setMessageText] = useState(''); ///page.tsx]
  const [tempSenderDisplayName, setTempSenderDisplayName] = useState(''); ///page.tsx]
  const [finalSenderDisplayName, setFinalSenderDisplayName] = useState<string | null>(null); ///page.tsx]
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(true); ///page.tsx]

  const [isLoading, setIsLoading] = useState(false); ///page.tsx]
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); ///page.tsx]
  const [pageError, setPageError] = useState<string | null>(null); ///page.tsx]

  const [displayedMessages, setDisplayedMessages] = useState<DisplayMessage[]>([]); ///page.tsx]
  const messagesEndRef = useRef<HTMLDivElement | null>(null); ///page.tsx]
  const ws = useRef<WebSocket | null>(null); ///page.tsx]
  const [anonSessionId, setAnonSessionId] = useState<string | null>(null); ///page.tsx]

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false); ///page.tsx]

  const [isUsernameValidating, setIsUsernameValidating] = useState(true); ///page.tsx]
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null); ///page.tsx]
  const [validatedRecipientUsername, setValidatedRecipientUsername] = useState<string>(""); ///page.tsx]

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

  const showBrowserNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: NOTIFICATION_ICON_URL,
        tag: `anonmsg-reply-${validatedRecipientUsername}-${anonSessionId}` // Unique tag for this chat session
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const openTermsModal = () => { ///page.tsx]
    setIsLegalModalOpen(true); ///page.tsx]
  };

  const scrollToBottom = () => { ///page.tsx]
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); ///page.tsx]
  };

  // ... (useEffect for username validation - existing code)/page.tsx]
  useEffect(() => { ///page.tsx]
    if (initialRecipientUsername) { ///page.tsx]
      setIsUsernameValidating(true); ///page.tsx]
      setPageError(null); ///page.tsx]
      setUsernameExists(null); ///page.tsx]

      fetch(`${API_BASE_URL}/api/auth/check-username/${encodeURIComponent(initialRecipientUsername)}`) ///page.tsx]
        .then(async (res) => { ///page.tsx]
          if (!res.ok) { ///page.tsx]
             const errorData = await res.json().catch(() => ({ message: "Error validating user." })); ///page.tsx]
            throw new Error(errorData.message || `Server error: ${res.status}`); ///page.tsx]
          }
          return res.json() as Promise<UsernameCheckResponse>; ///page.tsx]
        })
        .then((data) => { ///page.tsx]
          if (data.success && data.exists) { ///page.tsx]
            setUsernameExists(true); ///page.tsx]
            setValidatedRecipientUsername(data.username || initialRecipientUsername); ///page.tsx]
            
            let sessionIdValue = getCookie('anonSessionId'); ///page.tsx]
            if (!sessionIdValue) { ///page.tsx]
              sessionIdValue = generateUUID(); ///page.tsx]
              setCookie('anonSessionId', sessionIdValue, 30); ///page.tsx]
            }
            setAnonSessionId(sessionIdValue); ///page.tsx]
            
            
            if (sessionIdValue) { ///page.tsx]
              const nicknameCookieName = `anonSenderNickname_${sessionIdValue}_to_${data.username || initialRecipientUsername}`; ///page.tsx]
              const existingNickname = getCookie(nicknameCookieName); ///page.tsx]
              if (existingNickname) { ///page.tsx]
                setFinalSenderDisplayName(existingNickname); ///page.tsx]
                setTempSenderDisplayName(existingNickname); ///page.tsx]
                setIsUsernameModalOpen(false); ///page.tsx]
              } else { ///page.tsx]
                setIsUsernameModalOpen(true); ///page.tsx]
                if (!tempSenderDisplayName) { ///page.tsx]
                    setTempSenderDisplayName(getRandomName()); ///page.tsx]
                }
              }
            }

          } else if (data.success && !data.exists) { ///page.tsx]
            setUsernameExists(false); ///page.tsx]
            setPageError(`User "${initialRecipientUsername}" not found. The link may be broken or the user may not exist.`); ///page.tsx]
            setIsUsernameModalOpen(false); ///page.tsx]
          } else { ///page.tsx]
            throw new Error(data.message || "Invalid response from server while checking username."); ///page.tsx]
          }
        })
        .catch((err) => { ///page.tsx]
          console.error("Error validating username:", err); ///page.tsx]
          setPageError(`Could not verify user: ${(err as Error).message}. Please try again later.`); ///page.tsx]
          setUsernameExists(false); ///page.tsx]
          setIsUsernameModalOpen(false); ///page.tsx]
        })
        .finally(() => { ///page.tsx]
          setIsUsernameValidating(false); ///page.tsx]
        });
    } else { ///page.tsx]
      setPageError("Recipient username is missing from the URL."); ///page.tsx]
      setIsUsernameValidating(false); ///page.tsx]
      setUsernameExists(false); ///page.tsx]
      setIsUsernameModalOpen(false); ///page.tsx]
    }
  }, [initialRecipientUsername]); ///page.tsx]

  // ... (useEffect for chat history - existing code)/page.tsx]
  useEffect(() => { ///page.tsx]
    if (usernameExists && finalSenderDisplayName && anonSessionId && validatedRecipientUsername) { ///page.tsx]
      setIsHistoryLoading(true); ///page.tsx]
      setPageError(null); ///page.tsx]
      fetch(`${API_BASE_URL}/api/chat/session_history?sessionId=${encodeURIComponent(anonSessionId)}&recipient=${encodeURIComponent(validatedRecipientUsername)}`) ///page.tsx]
        .then(async (res) => { ///page.tsx]
          if (!res.ok) { ///page.tsx]
            const errorData = await res.json().catch(() => ({ message: "Failed to parse error from session_history" })); ///page.tsx]
            throw new Error(errorData.message || `Failed to fetch chat history. Status: ${res.status}`); ///page.tsx]
          }
          return res.json(); ///page.tsx]
        })
        .then((data) => { ///page.tsx]
          if (data.success && Array.isArray(data.messages)) { ///page.tsx]
            const fetchedHistoryMessages: DisplayMessage[] = data.messages.map((apiMsg: ApiHistoryMessage): DisplayMessage => { ///page.tsx]
              const isReplyFromRecipient = apiMsg.senderType === 'self'; ///page.tsx]
              const messageTimestamp = apiMsg.timestamp ? new Date(apiMsg.timestamp) : new Date(); ///page.tsx]

              return { ///page.tsx]
                id: apiMsg.id || `hist-${messageTimestamp.toISOString()}-${Math.random()}`, ///page.tsx]
                text: apiMsg.text, ///page.tsx]
                sender: isReplyFromRecipient ? validatedRecipientUsername : (apiMsg.nickname || finalSenderDisplayName || "Anonymous"), ///page.tsx]
                timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ///page.tsx]
                originalTimestamp: apiMsg.timestamp, ///page.tsx]
                isReply: isReplyFromRecipient, ///page.tsx]
                nickname: !isReplyFromRecipient ? (apiMsg.nickname || finalSenderDisplayName) : undefined, ///page.tsx]
              };
            });

            setDisplayedMessages(prevMessages => { ///page.tsx]
              const messageMap = new Map<string, DisplayMessage>(); ///page.tsx]
              fetchedHistoryMessages.forEach(msg => messageMap.set(msg.id, msg)); ///page.tsx]
              prevMessages.forEach(msg => messageMap.set(msg.id, msg)); ///page.tsx]

              return Array.from(messageMap.values()).sort((a, b) => ///page.tsx]
                new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime() ///page.tsx]
              );
            });
            if (fetchedHistoryMessages.length > 0) { ///page.tsx]
              setTimeout(scrollToBottom, 0); ///page.tsx]
            }
          } else if (data.success && data.messages.length === 0) { ///page.tsx]
             setDisplayedMessages([]); ///page.tsx]
          }
          else { ///page.tsx]
            throw new Error(data.message || "Invalid data format for chat history."); ///page.tsx]
          }
        })
        .catch(err => { ///page.tsx]
          console.error("Error fetching chat history:", err); ///page.tsx]
          setPageError(`Could not load previous messages: ${(err as Error).message}.`); ///page.tsx]
        }).finally(() => setIsHistoryLoading(false)); ///page.tsx]
    }
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername]); ///page.tsx]


  // Effect for WebSocket connection
  useEffect(() => { ///page.tsx]
    if (!usernameExists || !finalSenderDisplayName || !anonSessionId || !validatedRecipientUsername) return; ///page.tsx]
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return; ///page.tsx]

    const socketUrl = `${WEBSOCKET_BASE_URL}/ws/chat?anonSessionId=${anonSessionId}`; ///page.tsx]
    console.log("Connecting to Anon WebSocket:", socketUrl, "for session:", anonSessionId); ///page.tsx]
    const socket = new WebSocket(socketUrl); ///page.tsx]
    ws.current = socket; ///page.tsx]

    socket.onopen = () => { ///page.tsx]
      console.log('Anon WebSocket connection established for session:', anonSessionId); ///page.tsx]
      setPageError(null); ///page.tsx]
    }
    socket.onmessage = (event) => { ///page.tsx]
      try {
        const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string); ///page.tsx]
        console.log("Anon received message:", messagePayload); ///page.tsx]
        if (messagePayload.type === "USER_TO_ANON" && messagePayload.to === anonSessionId) { ///page.tsx]
          const messageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date(); ///page.tsx]
          const newDisplayMessage: DisplayMessage = { ///page.tsx]
            id: `reply-${messagePayload.timestamp || Date.now()}-${Math.random()}`, ///page.tsx]
            text: messagePayload.content, ///page.tsx]
            sender: validatedRecipientUsername, ///page.tsx]
            timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ///page.tsx]
            originalTimestamp: messageTimestamp.toISOString(), ///page.tsx]
            isReply: true, ///page.tsx]
          };
          setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime())); ///page.tsx]
          setTimeout(scrollToBottom, 0); ///page.tsx]

          // --- Notification and Sound ---
          playNotificationSound();
          if (document.hidden) {
            showBrowserNotification(
              `Reply from ${validatedRecipientUsername}`,
              messagePayload.content
            );
          }
          // --- End Notification and Sound ---

        } else if (messagePayload.type === "ERROR") { ///page.tsx]
            setPageError(`Server error: ${messagePayload.content}`); ///page.tsx]
        } else if (messagePayload.type === "INFO") { ///page.tsx]
             console.log("WebSocket INFO:", messagePayload.content); ///page.tsx]
        }
      } catch (e) { ///page.tsx]
        console.error('Error processing incoming message:', e); ///page.tsx]
        setPageError("Received an invalid message from the server."); ///page.tsx]
      }
    };
    socket.onerror = (errorEvent) => { ///page.tsx]
      console.error('Anon WebSocket error:', errorEvent); ///page.tsx]
      setPageError('Chat connection error. Please refresh. If persists, service might be unavailable.'); ///page.tsx]
      ws.current = null; ///page.tsx]
    };
    socket.onclose = (closeEvent) => { ///page.tsx]
      console.log('Anon WebSocket connection closed:', closeEvent.code, closeEvent.reason); ///page.tsx]
      ws.current = null; ///page.tsx]
    };
    return () => { ///page.tsx]
      if (ws.current && ws.current.readyState === WebSocket.OPEN) { ///page.tsx]
        ws.current.close(1000, "Client navigating or unmounting"); ///page.tsx]
      }
      ws.current = null; ///page.tsx]
    };
  }, [usernameExists, finalSenderDisplayName, anonSessionId, validatedRecipientUsername]); ///page.tsx]


  // ... (useEffect for beforeunload, handleSetUsernameInternal, handleUseRandomNameInternal, handleSubmitMessage - existing code)/page.tsx]
  useEffect(() => { ///page.tsx]
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { ///page.tsx]
      if (messageText.trim() !== '' && !isLoading ) { ///page.tsx]
        const confirmationMessage = "You have an unsent message. Are you sure you want to leave?"; ///page.tsx]
        event.preventDefault(); event.returnValue = confirmationMessage; return confirmationMessage; ///page.tsx]
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload); ///page.tsx]
    return () => window.removeEventListener('beforeunload', handleBeforeUnload); ///page.tsx]
  }, [messageText, isLoading]); ///page.tsx]


  const handleSetUsernameInternal = (e?: FormEvent) => { ///page.tsx]
    e?.preventDefault(); ///page.tsx]
    if (!validatedRecipientUsername) return; ///page.tsx]
    let nameToSet = tempSenderDisplayName.trim(); ///page.tsx]
    if (nameToSet === '') { ///page.tsx]
      nameToSet = getRandomName(); ///page.tsx]
    }
    setFinalSenderDisplayName(nameToSet); ///page.tsx]
    if (anonSessionId && validatedRecipientUsername) { ///page.tsx]
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(nameToSet), 1); ///page.tsx]
    }
    setIsUsernameModalOpen(false); ///page.tsx]
    setPageError(null); ///page.tsx]
  };

  const handleUseRandomNameInternal = () => { ///page.tsx]
     if (!validatedRecipientUsername) return; ///page.tsx]
    const randomName = getRandomName(); ///page.tsx]
    setTempSenderDisplayName(randomName); ///page.tsx]
    setFinalSenderDisplayName(randomName); ///page.tsx]
    if (anonSessionId && validatedRecipientUsername) { ///page.tsx]
        setCookie(`anonSenderNickname_${anonSessionId}_to_${validatedRecipientUsername}`, encodeURIComponent(randomName), 1); ///page.tsx]
    }
    setIsUsernameModalOpen(false); ///page.tsx]
    setPageError(null); ///page.tsx]
  };

  const handleSubmitMessage = async (e: FormEvent) => { ///page.tsx]
    e.preventDefault(); ///page.tsx]
    if (!messageText.trim()) { setPageError("Message cannot be empty."); return; } ///page.tsx]
    if (!validatedRecipientUsername) { setPageError("Cannot send message: recipient is not defined or invalid."); return; } ///page.tsx]
    if (!finalSenderDisplayName) { setPageError("Please set a temporary display name first."); setIsUsernameModalOpen(true); return; } ///page.tsx]
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) { ///page.tsx]
      setPageError("Not connected to chat server. Please wait or refresh. Retrying connection..."); ///page.tsx]
      return; ///page.tsx]
    }

    setIsLoading(true); setPageError(null); ///page.tsx]
    const currentMessageTimestamp = new Date(); ///page.tsx]

    const messagePayload: WebSocketMessagePayload = { ///page.tsx]
      type: "ANON_TO_USER", ///page.tsx]
      from: anonSessionId || "unknown_anon_session", ///page.tsx]
      to: validatedRecipientUsername, ///page.tsx]
      content: messageText.trim(), ///page.tsx]
      nickname: finalSenderDisplayName, ///page.tsx]
      timestamp: currentMessageTimestamp.toISOString(), ///page.tsx]
    };

    try { ///page.tsx]
      ws.current.send(JSON.stringify(messagePayload)); ///page.tsx]
      const newMessageId = `sent-${currentMessageTimestamp.toISOString()}-${Math.random()}`; ///page.tsx]
      const newDisplayMessage: DisplayMessage = { ///page.tsx]
        id: newMessageId, ///page.tsx]
        text: messageText.trim(), ///page.tsx]
        sender: finalSenderDisplayName, ///page.tsx]
        timestamp: currentMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ///page.tsx]
        originalTimestamp: currentMessageTimestamp.toISOString(), ///page.tsx]
        isReply: false, ///page.tsx]
      };
      setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime())); ///page.tsx]
      setMessageText(''); ///page.tsx]
      setTimeout(scrollToBottom, 0); ///page.tsx]
    } catch (err: any) { ///page.tsx]
      console.error("Error sending message via WebSocket:", err); ///page.tsx]
      setPageError(err.message || 'An unexpected error occurred while sending.'); ///page.tsx]
    } finally { ///page.tsx]
      setIsLoading(false); ///page.tsx]
    }
  };

  // ... (AdvertPanel - existing code)/page.tsx]
  const AdvertPanel = () => ( ///page.tsx]
    <div className="w-full bg-teal-600 text-white shadow-xl rounded-2xl p-6 md:p-8 text-center"> {/*/page.tsx] */}
        <UserPlus className="w-12 h-12 text-teal-200 mx-auto mb-3" /> {/*/page.tsx] */}
        <h2 className="text-xl md:text-2xl font-semibold mb-2">Want to Receive Your Own Anonymous Messages?</h2> {/*/page.tsx] */}
        <p className="text-teal-100 mb-6 text-sm md:text-base"> {/*/page.tsx] */}
        Create a free AnonMsg account to get your unique chat link. Share it with friends, on social media, or anywhere to see what people *really* think!
        </p>
        <Link
            href="/auth?view=signup"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-teal-600 font-bold py-2.5 px-8 rounded-lg text-base transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-opacity-75"
        >
            Create Your Free Account
        </Link> {/*/page.tsx] */}
        <p className="text-xs text-teal-200 mt-4"> {/*/page.tsx] */}
        It's fast, easy, and opens up a world of honest conversations.
        </p>
    </div>
  );


  // ... (Loading states, user not found, username modal - existing code)/page.tsx]
  if (isUsernameValidating) { ///page.tsx]
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]"> {/*/page.tsx] */}
        <AnonHeader showCreateLink={false} /> {/*/page.tsx] */}
        <main className="flex-grow container mx-auto py-20 px-4 flex flex-col items-center justify-center text-center"> {/*/page.tsx] */}
          <Loader2 size={48} className="animate-spin text-teal-500 mb-4" /> {/*/page.tsx] */}
          <p className="text-lg text-gray-600">Verifying user <span className="font-semibold">{initialRecipientUsername}</span>...</p> {/*/page.tsx] */}
        </main>
         <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto"> {/*/page.tsx] */}
            <div className="container mx-auto"> {/*/page.tsx] */}
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> {/*/page.tsx] */}
            </div>
        </footer>
      </div>
    );
  }

  if (usernameExists === false) { ///page.tsx]
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]"> {/*/page.tsx] */}
        <AnonHeader /> {/*/page.tsx] */}
        <main className="flex-grow container mx-auto py-16 px-4 flex flex-col items-center justify-center text-center"> {/*/page.tsx] */}
          <Frown size={64} className="text-yellow-500 mb-6" /> {/*/page.tsx] */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">User Not Found</h1> {/*/page.tsx] */}
          <p className="text-gray-600 mb-2 max-w-md"> {/*/page.tsx] */}
            The user <strong className="text-teal-600">{initialRecipientUsername}</strong> could not be found. {/*/page.tsx] */}
          </p>
          <p className="text-gray-500 mb-8 max-w-md"> {/*/page.tsx] */}
            {pageError || "The link might be broken, or the user may have changed their username or deleted their account."} {/*/page.tsx] */}
          </p>
          <Link href="/" passHref> {/*/page.tsx] */}
            <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"> {/*/page.tsx] */}
              Back to Homepage
            </button>
          </Link>
        </main>
         <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto"> {/*/page.tsx] */}
            <div className="container mx-auto"> {/*/page.tsx] */}
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> {/*/page.tsx] */}
            </div>
        </footer>
      </div>
    );
  }

  if (isUsernameModalOpen && usernameExists) { ///page.tsx]
    return (
      <>
      <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]"> {/*/page.tsx] */}
        <AnonHeader /> {/*/page.tsx] */}
         <main className="flex-grow container mx-auto py-8 px-4 text-center"> {/*/page.tsx] */}
            <p className="text-lg text-gray-600 p-10">Loading chat setup...</p> {/*/page.tsx] */}
        </main>
        <UsernameModalComponent
            tempSenderDisplayName={tempSenderDisplayName}
            setTempSenderDisplayName={setTempSenderDisplayName}
            handleSetUsername={handleSetUsernameInternal}
            handleUseRandomName={handleUseRandomNameInternal}
            recipientUsername={validatedRecipientUsername}
        /> {/*/page.tsx] */}
        <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto"> {/*/page.tsx] */}
            <div className="container mx-auto"> {/*/page.tsx] */}
                <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> {/*/page.tsx] */}
                 <p className="mt-1">Remember to be respectful. Do not use this service for harassment.</p> {/*/page.tsx] */}
            </div>
        </footer>
      </div>
      </>
    );
  }


  return (
    <>
    <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]"> {/*/page.tsx] */}
      <AnonHeader /> {/*/page.tsx] */}
      {isUsernameModalOpen && usernameExists && !finalSenderDisplayName && ( ///page.tsx]
        <UsernameModalComponent
          tempSenderDisplayName={tempSenderDisplayName}
          setTempSenderDisplayName={setTempSenderDisplayName}
          handleSetUsername={handleSetUsernameInternal}
          handleUseRandomName={handleUseRandomNameInternal}
          recipientUsername={validatedRecipientUsername}
        /> /*/page.tsx] */
      )}

      <main className="flex-grow container mx-auto py-8 px-4"> {/*/page.tsx] */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start"> {/*/page.tsx] */}
          <aside className="w-full md:w-1/3 lg:w-2/5 md:sticky md:top-24 order-2 md:order-1"> {/*/page.tsx] */}
            <AdvertPanel /> {/*/page.tsx] */}
             {usernameExists && finalSenderDisplayName && (
                 <div className="mt-6 bg-white p-4 rounded-xl shadow-lg text-center">
                    <button
                        onClick={requestNotificationPermission}
                        title={notificationPermission === 'granted' ? "Reply Notifications Enabled" : "Enable Reply Notifications"}
                        className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                            ${notificationPermission === 'granted' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                            notificationPermission === 'denied' ? 'bg-red-100 text-red-700 cursor-not-allowed' :
                            'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                        disabled={notificationPermission === 'denied'}
                    >
                        <BellDot size={18} />
                        <span>
                            {notificationPermission === 'granted' ? "Reply Notifications Active" :
                             notificationPermission === 'denied' ? "Notifications Blocked" :
                             "Get Reply Notifications"}
                        </span>
                    </button>
                    {notificationPermission === 'denied' && <p className="text-xs text-red-600 mt-1">Enable in browser settings.</p>}
                 </div>
             )}
          </aside>

          <section className="w-full md:w-2/3 lg:w-3/5 order-1 md:order-2"> {/*/page.tsx] */}
            <div className="bg-white shadow-xl rounded-2xl flex flex-col" style={{ minHeight: '70vh', maxHeight: '85vh' }}> {/*/page.tsx] */}
              <div className="p-4 md:p-5 border-b border-gray-200 text-center"> {/*/page.tsx] */}
                <MessageSquareText className="w-10 h-10 text-teal-500 mx-auto mb-2" /> {/*/page.tsx] */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-800"> {/*/page.tsx] */}
                  Send to <span className="text-teal-600">{validatedRecipientUsername || "User"}</span> {/*/page.tsx] */}
                </h1>
                {finalSenderDisplayName && ( ///page.tsx]
                  <p className="text-xs text-gray-500 mt-1"> {/*/page.tsx] */}
                    Your alias: <span className="font-semibold text-gray-700">{finalSenderDisplayName}</span> {/*/page.tsx] */}
                  </p>
                )}
                {pageError && usernameExists && ( ///page.tsx]
                    <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200"> {/*/page.tsx] */}
                        <AlertTriangle size={18} className="flex-shrink-0"/> {/*/page.tsx] */}
                        <span>{pageError}</span> {/*/page.tsx] */}
                    </div>
                )}
              </div>

              <div className="flex-grow p-4 space-y-3 overflow-y-auto"> {/*/page.tsx] */}
                {isHistoryLoading && displayedMessages.length === 0 && ( ///page.tsx]
                    <div className="text-center py-10"> {/*/page.tsx] */}
                        <Loader2 size={28} className="animate-spin mx-auto text-teal-500 mb-2" /> {/*/page.tsx] */}
                        <p className="text-sm text-gray-500">Loading messages...</p> {/*/page.tsx] */}
                    </div>
                )}
                {!isHistoryLoading && displayedMessages.length === 0 && finalSenderDisplayName && validatedRecipientUsername && !isUsernameModalOpen && ( ///page.tsx]
                    <div className="text-center text-gray-400 text-sm py-6">Your alias <span className="font-semibold text-teal-500">{finalSenderDisplayName}</span> is set. Start sending messages to <span className="font-semibold text-teal-500">{validatedRecipientUsername}</span>. Replies will appear here.</div> /*/page.tsx] */
                )}
                {displayedMessages.map((msg) => ( ///page.tsx]
                  <div key={msg.id} className={`flex ${msg.isReply ? 'justify-start' : 'justify-end'}`}> {/*/page.tsx] */}
                    <div className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl shadow-sm ${ ///page.tsx]
                        msg.isReply ///page.tsx]
                        ? 'bg-gray-200 text-gray-800 rounded-bl-none' ///page.tsx]
                        : 'bg-teal-500 text-white rounded-br-none' ///page.tsx]
                    }`}>
                      {msg.isReply && <p className="text-xs font-semibold text-gray-600 mb-0.5">{msg.sender}</p>} {/*/page.tsx] */}
                      <p className="text-sm leading-snug">{msg.text}</p> {/*/page.tsx] */}
                      <p className={`text-xs mt-1 ${msg.isReply ? 'text-gray-500 text-left' : 'text-teal-100 text-right'}`}>{msg.timestamp}</p> {/*/page.tsx] */}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} /> {/*/page.tsx] */}
              </div>

              <div className="px-4 pb-2"> {/*/page.tsx] */}
                 {pageError && validatedRecipientUsername && usernameExists && !isUsernameModalOpen && ( ///page.tsx]
                    <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mb-2"> {/*/page.tsx] */}
                    <AlertTriangle size={18} className="flex-shrink-0" /> {/*/page.tsx] */}
                    <span>{pageError}</span> {/*/page.tsx] */}
                    </div>
                )}
              </div>


              {finalSenderDisplayName && validatedRecipientUsername && usernameExists && ( ///page.tsx]
                <form onSubmit={handleSubmitMessage} className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl"> {/*/page.tsx] */}
                  <div className="flex items-center space-x-2"> {/*/page.tsx] */}
                    <textarea
                      id="messageText" rows={2} value={messageText} onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Your anonymous message...`} required
                      className="flex-grow bg-white border border-gray-300 text-gray-800 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none"
                      disabled={isLoading || !finalSenderDisplayName || !anonSessionId || isHistoryLoading}
                      onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitMessage(e); }}}
                    /> {/*/page.tsx] */}
                    <button type="submit"
                      disabled={isLoading || isHistoryLoading || !finalSenderDisplayName || !messageText.trim() || !anonSessionId || (ws.current?.readyState !== WebSocket.OPEN) }
                      className="bg-teal-500 text-white p-2.5 rounded-xl hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send message"> {/*/page.tsx] */}
                      {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />} {/*/page.tsx] */}
                    </button>
                  </div>
                   {ws.current?.readyState !== WebSocket.OPEN && !isLoading && finalSenderDisplayName && !isHistoryLoading && ( ///page.tsx]
                        <p className="text-xs text-orange-600 mt-1.5 text-center">Chat not connected. Attempting to connect...</p> ///page.tsx]
                    )}
                </form>
              )}
               {!finalSenderDisplayName && validatedRecipientUsername && usernameExists && !isUsernameModalOpen && !isHistoryLoading && ( ///page.tsx]
                    <div className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl text-center"> {/*/page.tsx] */}
                        <button
                            onClick={() => { setIsUsernameModalOpen(true); if (!tempSenderDisplayName) setTempSenderDisplayName(getRandomName()); }}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm">
                            Set Your Alias to Chat
                        </button> {/*/page.tsx] */}
                    </div>
                )}
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto"> {/*/page.tsx] */}
        <div className="container mx-auto"> {/*/page.tsx] */}
          <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p> {/*/page.tsx] */}
          <p className="mt-1">Remember to be respectful. Do not use this service for harassment. By using this service, you agree to our{" "} {/*/page.tsx] */}
            <button onClick={openTermsModal} className="text-teal-400 hover:text-teal-300 underline">Terms of Service</button>. {/*/page.tsx] */}
          </p>
        </div>
      </footer>
    </div>
    <LegalModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} title="Terms and Conditions" content={<TermsAndConditionsContent />} /> {/*/page.tsx] */}
    </>
  );
}