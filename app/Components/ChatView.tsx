"use client";

import React from 'react';
import { ArrowLeft, LogOut, Trash2, SendHorizontal, UserCircle } from 'lucide-react';
import { Chat } from '../types'; 
import Image from 'next/image';

interface ChatViewProps {
  chat: Chat;
  onSendMessage: () => void;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onOpenModal: (action: 'delete' | 'logout' | 'close_chat') => void; // This interface is correct
}

const ChatView: React.FC<ChatViewProps> = ({
  chat,
  onSendMessage,
  newMessage,
  setNewMessage,
  messagesEndRef,
  onBack,
  onOpenModal,
}) => {
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 shadow-inner md:shadow-none">
      <header className="bg-gray-50 p-3 md:p-4 flex justify-between items-center border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="md:hidden text-teal-600 hover:text-teal-700 p-1 rounded-full hover:bg-teal-100"
            aria-label="Back to chats"
          >
            <ArrowLeft size={22} />
          </button>
          {chat.avatar ? (
            <Image
                src={chat.avatar}
                alt={chat.sender}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <UserCircle size={36} className="text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold text-lg text-gray-700">{chat.sender}</h3>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={() => onOpenModal('logout')}
            className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => onOpenModal('delete')}
            className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
            aria-label="Delete chat"
            title="Delete Chat"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-white">
        {chat.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'self' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                msg.sender === 'self'
                  ? 'bg-teal-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-snug">{msg.text}</p>
              <p
                className={`text-xs mt-1.5 ${
                  msg.sender === 'self' ? 'text-teal-100 text-right' : 'text-gray-500 text-left'
                }`}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-gray-50 p-3 md:p-4 border-t border-gray-200 sticky bottom-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-grow bg-white border border-gray-300 text-gray-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
          />
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="bg-teal-500 text-white p-3 rounded-xl hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <SendHorizontal size={22} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;