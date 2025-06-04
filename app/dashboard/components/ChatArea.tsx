// app/dashboard/components/ChatArea.tsx
"use client";

import React from 'react';
import { MessageSquareText, AlertTriangle, Loader2 } from 'lucide-react';
import ChatView from '../../Components/ChatView'; // Adjust path as needed
import { Chat } from '../../types'; // Adjust path as needed

interface ChatAreaProps {
  selectedChat: Chat | null;
  onSendMessage: () => void;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBackFromChatView: () => void;
  onOpenChatActionModal: (action: 'delete' | 'close_chat' | 'logout') => void;
  userError?: string | null;
  isLoadingChats: boolean;
  isWebSocketConnecting: boolean; // To show specific loading for WebSocket
  isWebSocketConnected: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedChat,
  onSendMessage,
  newMessage,
  setNewMessage,
  messagesEndRef,
  onBackFromChatView,
  onOpenChatActionModal,
  userError,
  isWebSocketConnecting,
  isWebSocketConnected,
}) => {
  if (selectedChat) {
    return (
      <ChatView
        key={selectedChat.id}
        chat={selectedChat}
        onSendMessage={onSendMessage}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        messagesEndRef={messagesEndRef}
        onBack={onBackFromChatView}
        onOpenModal={onOpenChatActionModal}
      />
    );
  }

  return (
    <div className="hidden md:flex flex-col flex-grow items-center justify-center p-6 md:p-10 bg-white text-center">
      <MessageSquareText className="w-20 h-20 text-teal-300 mb-5 animate-pulse" style={{ animationDuration: '3s' }} />
      <h2 className="text-2xl font-semibold text-gray-700 mb-1">Welcome to your Dashboard!</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        Select a conversation from the sidebar to view messages, or share your anonymous link to start receiving them.
      </p>

      {/* Displaying errors or WebSocket status */}
      {userError &&
        !userError.includes('reconnect') && // Don't show reconnecting messages here if sidebar handles them
        !userError.includes('lost') && (
        <p className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200 flex items-center">
          <AlertTriangle size={16} className="mr-2 flex-shrink-0" /> {userError}
        </p>
      )}
      {isWebSocketConnecting && (
        <p className="mt-4 text-yellow-600 text-sm flex items-center">
          <Loader2 size={16} className="animate-spin mr-2" />
          Connecting to chat server...
        </p>
      )}
      {!isWebSocketConnected && !isWebSocketConnecting && !userError?.includes('reconnect') && (
         <p className="mt-4 text-orange-500 text-sm bg-orange-50 p-3 rounded-md border border-orange-200 flex items-center">
             <AlertTriangle size={16} className="mr-2 flex-shrink-0" /> Chat server disconnected. Will attempt to reconnect.
         </p>
      )}
    </div>
  );
};

export default ChatArea;