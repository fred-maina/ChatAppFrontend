// app/chat/[username]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, UserPlus, MessageSquareText, AlertTriangle, CheckCircle, Loader2, X, VenetianMask } from 'lucide-react';
import LegalModal from '../../Components/LegalModal';
import TermsAndConditionsContent from '../../Components/TermsAndConditionsContent';
import { WebSocketMessagePayload, ChatMessage as AppChatMessage } from '../../types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to set a cookie
const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Ensure SameSite=Lax or Strict and Secure if applicable in production
  document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
};

// Helper function to get a cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
};


const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface DisplayMessage extends AppChatMessage {
  isReply?: boolean;
}

// Define structure for chat message from API (mirroring ChatMessageDto from backend)
interface ApiChatMessageDto {
  id: string;
  text: string;
  senderType: 'anonymous' | 'recipient'; // 'anonymous' is the public user, 'recipient' is the dashboard owner
  timestamp: string; // ISO 8601
  nickname?: string; // Nickname of the anonymous sender (if senderType is 'anonymous')
}


const AnonHeader = () => (
  <header className="py-4 px-6 md:px-10 shadow-sm bg-white sticky top-0 z-40">
    <div className="container mx-auto flex justify-between items-center">
      <Link href="/" className="flex items-center space-x-2 cursor-pointer">
        <MessageSquareText className="h-8 w-8 text-teal-500" />
        <span className="text-xl font-semibold text-gray-700 hidden sm:block">AnonMsg</span>
      </Link>
      <Link
        href="/auth?view=signup"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-5 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 text-sm"
      >
        <UserPlus size={18} />
        <span>Create Your Own Chat</span>
      </Link>
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
  const recipientUsername = typeof params.username === 'string' ? params.username : '';

  const [messageText, setMessageText] = useState('');
  const [tempSenderDisplayName, setTempSenderDisplayName] = useState('');
  const [finalSenderDisplayName, setFinalSenderDisplayName] = useState<string | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(true); 

  const [isLoading, setIsLoading] = useState(false); // General loading (e.g., for sending message)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); // Specific for history
  const [error, setError] = useState<string | null>(null);

  const [displayedMessages, setDisplayedMessages] = useState<DisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [anonSessionId, setAnonSessionId] = useState<string | null>(null);

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const openTermsModal = () => {
    setIsLegalModalOpen(true);
  };

  // Effect for managing anonSessionId
  useEffect(() => {
    let sessionIdValue = getCookie('anonSessionId');
    if (!sessionIdValue) {
      sessionIdValue = generateUUID();
      setCookie('anonSessionId', sessionIdValue, 30); // 30 days for session ID
    }
    setAnonSessionId(sessionIdValue);
  }, []);

  // Effect for managing sender nickname and modal visibility
  useEffect(() => {
    if (!recipientUsername) {
      setError("Recipient username is missing from the URL.");
      setIsUsernameModalOpen(false); 
      return;
    }

    if (anonSessionId) {
      const nicknameCookieName = `anonSenderNickname_${anonSessionId}_to_${recipientUsername}`; // Make cookie specific to recipient
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
  }, [recipientUsername, anonSessionId, tempSenderDisplayName]); // Added tempSenderDisplayName to avoid resetting if user starts typing


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  // Effect for fetching chat history
  useEffect(() => {
    if (finalSenderDisplayName && anonSessionId && recipientUsername) {
      setIsHistoryLoading(true); 
      setError(null); // Clear previous errors before fetching history
      fetch(`${API_BASE_URL}/api/chat/session_history?sessionId=${encodeURIComponent(anonSessionId)}&recipient=${encodeURIComponent(recipientUsername)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to parse error from session_history" }));
            throw new Error(errorData.message || `Failed to fetch chat history. Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && Array.isArray(data.messages)) {
            const historyMessages: DisplayMessage[] = data.messages.map((msg: ApiChatMessageDto): DisplayMessage => {
              const isReply = msg.senderType === 'recipient';
              const messageTimestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
              return {
                id: msg.id || `hist-${Date.now()}-${Math.random()}`, 
                text: msg.text,
                sender: isReply ? recipientUsername : (msg.nickname || finalSenderDisplayName),
                timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isReply: isReply,
                nickname: !isReply ? (msg.nickname || finalSenderDisplayName) : undefined,
              };
            }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            setDisplayedMessages(prevMessages => {
              const existingIds = new Set(prevMessages.map(pm => pm.id));
              const newHistoryMessages = historyMessages.filter(hm => !existingIds.has(hm.id));
              // Combine, sort, and ensure no duplicates by ID again just in case.
              const combined = [...newHistoryMessages, ...prevMessages];
              const uniqueMessages = Array.from(new Map(combined.map(item => [item.id, item])).values());
              return uniqueMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });
          } else if (data.success && data.messages.length === 0) {
             // No messages, which is a valid success case.
             setDisplayedMessages([]); // Ensure it's empty if API returns empty
          }
          else {
            throw new Error(data.message || "Invalid data format for chat history.");
          }
        })
        .catch(err => {
          console.error("Error fetching chat history:", err);
          setError(`Could not load previous messages: ${err.message}.`);
        }).finally(() => setIsHistoryLoading(false));
    }
  }, [finalSenderDisplayName, anonSessionId, recipientUsername]); 


  // WebSocket connection logic
  useEffect(() => {
    if (!finalSenderDisplayName || !anonSessionId || !recipientUsername) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    const socketUrl = `${WEBSOCKET_BASE_URL}/ws/chat`; // No token for anonymous chat
    console.log("Connecting to Anon WebSocket:", socketUrl, "for session:", anonSessionId);
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('Anon WebSocket connection established for session:', anonSessionId);
      setError(null); // Clear connection errors
    }
    socket.onmessage = (event) => {
      try {
        const messagePayload: WebSocketMessagePayload = JSON.parse(event.data as string);
        console.log("Anon received message:", messagePayload);
        if (messagePayload.type === "USER_TO_ANON" && messagePayload.to === anonSessionId) {
          const messageTimestamp = messagePayload.timestamp ? new Date(messagePayload.timestamp) : new Date();
          const newDisplayMessage: DisplayMessage = {
            id: `reply-${Date.now()}-${Math.random()}`, text: messagePayload.content,
            sender: recipientUsername, // This would be the recipientUsername (dashboard owner)
            timestamp: messageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isReply: true,
          };
          setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        } else if (messagePayload.type === "ERROR") {
            setError(`Server error: ${messagePayload.content}`);
        } else if (messagePayload.type === "INFO") {
             console.log("WebSocket INFO:", messagePayload.content);
        }
      } catch (e) {
        console.error('Error processing incoming message:', e);
        setError("Received an invalid message from the server.");
      }
    };
    socket.onerror = (errorEvent) => {
      console.error('Anon WebSocket error:', errorEvent);
      setError('Chat connection error. Please refresh. If persists, service might be unavailable.');
      ws.current = null;
    };
    socket.onclose = (closeEvent) => {
      console.log('Anon WebSocket connection closed:', closeEvent.code, closeEvent.reason);
      if (!closeEvent.wasClean && finalSenderDisplayName && closeEvent.code !== 1000) { 
          // setError('Chat connection lost. Please refresh.'); // Can be noisy, only set if impacting.
      }
      ws.current = null;
    };
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, "Client navigating or unmounting");
      }
      ws.current = null;
    };
  }, [finalSenderDisplayName, anonSessionId, recipientUsername]);

  // beforeunload
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
    let nameToSet = tempSenderDisplayName.trim();
    if (nameToSet === '') {
      nameToSet = getRandomName();
    }
    setFinalSenderDisplayName(nameToSet);
    if (anonSessionId && recipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${recipientUsername}`, encodeURIComponent(nameToSet), 1); // Cookie lasts for 1 day
    }
    setIsUsernameModalOpen(false);
    setError(null);
  };

  const handleUseRandomNameInternal = () => {
    const randomName = getRandomName();
    setTempSenderDisplayName(randomName); // Update temp so if modal reopens it shows this
    setFinalSenderDisplayName(randomName);
    if (anonSessionId && recipientUsername) {
        setCookie(`anonSenderNickname_${anonSessionId}_to_${recipientUsername}`, encodeURIComponent(randomName), 1);
    }
    setIsUsernameModalOpen(false);
    setError(null);
  };

  const handleSubmitMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) { setError("Message cannot be empty."); return; }
    if (!recipientUsername) { setError("Cannot send message: recipient is not defined."); return; }
    if (!finalSenderDisplayName) { setError("Please set a temporary display name first."); setIsUsernameModalOpen(true); return; }
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError("Not connected to chat server. Please wait or refresh. Retrying connection...");
      // Attempt to re-establish connection
      if (finalSenderDisplayName && anonSessionId && recipientUsername) {
          // This will trigger the useEffect for WebSocket connection
      }
      return;
    }

    setIsLoading(true); setError(null); 

    const messagePayload: WebSocketMessagePayload = {
      type: "ANON_TO_USER", from: anonSessionId || "unknown_anon_session",
      to: recipientUsername, content: messageText.trim(), nickname: finalSenderDisplayName,
      timestamp: new Date().toISOString(),
    };

    try {
      ws.current.send(JSON.stringify(messagePayload));
      const newMessageId = `sent-${Date.now()}-${Math.random()}`;
      const newDisplayMessage: DisplayMessage = {
        id: newMessageId, text: messageText.trim(), sender: finalSenderDisplayName, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isReply: false, 
      };
      setDisplayedMessages(prev => [...prev, newDisplayMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      setMessageText('');
    } catch (err: any) {
      console.error("Error sending message via WebSocket:", err);
      setError(err.message || 'An unexpected error occurred while sending.');
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
        It's fast, easy, and opens up a world of honest conversations.
        </p>
    </div>
  );

  return (
    <>
    <div className="min-h-screen flex flex-col bg-gray-100 font-['Inter',_sans-serif]">
      <AnonHeader />
      {isUsernameModalOpen && recipientUsername && ( 
        <UsernameModalComponent
          tempSenderDisplayName={tempSenderDisplayName}
          setTempSenderDisplayName={setTempSenderDisplayName}
          handleSetUsername={handleSetUsernameInternal}
          handleUseRandomName={handleUseRandomNameInternal}
          recipientUsername={recipientUsername}
        />
      )}

      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          <aside className="w-full md:w-1/3 lg:w-2/5 md:sticky md:top-24 order-2 md:order-1">
            <AdvertPanel />
          </aside>

          <section className="w-full md:w-2/3 lg:w-3/5 order-1 md:order-2">
            <div className="bg-white shadow-xl rounded-2xl flex flex-col" style={{ minHeight: '70vh', maxHeight: '85vh' }}>
              <div className="p-4 md:p-5 border-b border-gray-200 text-center">
                <MessageSquareText className="w-10 h-10 text-teal-500 mx-auto mb-2" />
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                  Send to <span className="text-teal-600">{recipientUsername || "User"}</span>
                </h1>
                {finalSenderDisplayName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Your alias: <span className="font-semibold text-gray-700">{finalSenderDisplayName}</span>
                  </p>
                )}
                {!recipientUsername && error && ( // Only if recipient is missing and there's an error for it
                    <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                        <AlertTriangle size={18} className="flex-shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}
              </div>

              <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                {isHistoryLoading && displayedMessages.length === 0 && (
                    <div className="text-center py-10">
                        <Loader2 size={28} className="animate-spin mx-auto text-teal-500 mb-2" /> 
                        <p className="text-sm text-gray-500">Loading messages...</p>
                    </div>
                )}
                {!isHistoryLoading && displayedMessages.length === 0 && finalSenderDisplayName && recipientUsername && !isUsernameModalOpen && (
                    <div className="text-center text-gray-400 text-sm py-6">Your alias <span className="font-semibold text-teal-500">{finalSenderDisplayName}</span> is set. Start sending messages to <span className="font-semibold text-teal-500">{recipientUsername}</span>. Replies will appear here.</div>
                )}
                {displayedMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isReply ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl shadow-sm ${
                        msg.isReply
                        ? 'bg-gray-200 text-gray-800 rounded-bl-none' 
                        : 'bg-teal-500 text-white rounded-br-none'    
                    }`}>
                      {msg.isReply && <p className="text-xs font-semibold text-gray-600 mb-0.5">{msg.sender}</p>}
                      <p className="text-sm leading-snug">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.isReply ? 'text-gray-500 text-left' : 'text-teal-100 text-right'}`}>{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 pb-2">
                {error && !isUsernameModalOpen && ( 
                    <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mb-2">
                    <AlertTriangle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                    </div>
                )}
              </div>

              {finalSenderDisplayName && recipientUsername && (
                <form onSubmit={handleSubmitMessage} className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                  <div className="flex items-center space-x-2">
                    <textarea
                      id="messageText" rows={2} value={messageText} onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Your anonymous message...`} required
                      className="flex-grow bg-white border border-gray-300 text-gray-800 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none"
                      disabled={isLoading || !finalSenderDisplayName || !anonSessionId || isHistoryLoading}
                      onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitMessage(e); }}}
                    />
                    <button type="submit"
                      disabled={isLoading || isHistoryLoading || !finalSenderDisplayName || !messageText.trim() || !anonSessionId || (ws.current?.readyState !== WebSocket.OPEN) }
                      className="bg-teal-500 text-white p-2.5 rounded-xl hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send message">
                      {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
                    </button>
                  </div>
                   {ws.current?.readyState !== WebSocket.OPEN && !isLoading && finalSenderDisplayName && !isHistoryLoading && (
                        <p className="text-xs text-orange-600 mt-1.5 text-center">Chat not connected. Attempting to connect...</p>
                    )}
                </form>
              )}
               {!finalSenderDisplayName && recipientUsername && !isUsernameModalOpen && !isHistoryLoading && ( 
                    <div className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl text-center">
                        <button
                            onClick={() => { setIsUsernameModalOpen(true); if (!tempSenderDisplayName) setTempSenderDisplayName(getRandomName()); }}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm">
                            Set Your Alias to Chat
                        </button>
                    </div>
                )}
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 px-6 md:px-10 text-center text-sm mt-auto">
        <div className="container mx-auto">
          <p>&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
          <p className="mt-1">Remember to be respectful. Do not use this service for harassment. By using this service, you agree to our{" "}
            <button onClick={openTermsModal} className="text-teal-400 hover:text-teal-300 underline">Terms of Service</button>.
          </p>
        </div>
      </footer>
    </div>
    <LegalModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} title="Terms and Conditions" content={<TermsAndConditionsContent />} />
    </>
  );
}