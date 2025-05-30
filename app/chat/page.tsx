"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, SendHorizontal, LogOut, Trash2, ArrowLeft, MessageSquareText, Home } from 'lucide-react'; // Added Home
import Link from 'next/link'; // Added Link
import SidebarContent from '../Components/SidebarContent';
import ChatView from '../Components/ChatView';
import Modal from '../Components/Modal';
import { Chat, ChatMessage } from '../types';

const MASK_IMAGE_URL = "https://placehold.co/500x500/000000/FFFFFF?text=Mask+Placeholder";

const initialSampleChats: Chat[] = [
  { id: 1, sender: 'User Alpha', messagePreview: 'Project update?', messages: [ { id: 'm1', text: 'Hey, how are things going with the project?', sender: 'User Alpha', timestamp: '10:00 AM' }, { id: 'm2', text: 'Pretty good! Making progress.', sender: 'self', timestamp: '10:01 AM' }, ], avatar: `https://i.pravatar.cc/150?u=alpha`, },
  { id: 2, sender: 'User Beta', messagePreview: 'Report EOD?', messages: [ { id: 'm4', text: 'Can you send over the report by EOD?', sender: 'User Beta', timestamp: '11:00 AM' }, { id: 'm5', text: 'Sure, I am working on it now.', sender: 'self', timestamp: '11:01 AM'}, ], avatar: `https://i.pravatar.cc/150?u=beta`, },
  { id: 3, sender: 'Anonymous Fox', messagePreview: 'New feature question.', messages: [ { id: 'm6', text: 'Just a quick question about the new feature.', sender: 'Anonymous Fox', timestamp: '11:30 AM'} ] }
];

const ChatPage = () => {
  // isSidebarOpen is now only for controlling the desktop sidebar if we make it toggleable,
  // or can be removed if desktop sidebar is always static.
  // For mobile, the logic is based on selectedChat.
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Potentially remove or repurpose

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>(initialSampleChats);
  const [newMessage, setNewMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; confirmText: string; action: 'delete' | 'logout' | null; bodyText?: string; isDestructive?: boolean }>({ title: '', confirmText: '', action: null });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedChat?.messages.length) {
      scrollToBottom();
    }
  }, [selectedChat, selectedChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // No need to manage isSidebarOpen for mobile here anymore
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === '' || !selectedChat) return;
    const message: ChatMessage = {
      id: `m${Date.now()}`, text: newMessage, sender: 'self',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChats(prevChats => prevChats.map(c =>
      c.id === selectedChat.id
        ? { ...c, messages: [...c.messages, message], messagePreview: newMessage }
        : c
    ));
    setNewMessage('');
  };

  const openModal = (action: 'delete' | 'logout') => {
    if (action === 'delete') {
      setModalContent({ title: 'Delete Chat?', bodyText: 'This will permanently remove all messages in this conversation.', confirmText: 'Delete', action: 'delete', isDestructive: true });
    } else if (action === 'logout') { // Renaming 'logout' to 'leave chat' contextually
      setModalContent({ title: 'Leave Chat?', bodyText: 'You will stop receiving messages in this conversation.', confirmText: 'Leave', action: 'logout', isDestructive: false });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirmModal = () => {
    if (modalContent.action === 'delete' && selectedChat) {
      setChats(prevChats => prevChats.filter(chat => chat.id !== selectedChat.id));
      setSelectedChat(null);
    } else if (modalContent.action === 'logout') {
      setSelectedChat(null); // Deselects chat
    }
    closeModal();
  };
  
  // This function is called by ChatView's back button (primarily for mobile)
  const handleBackToChatList = () => {
    setSelectedChat(null);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row font-['Inter',_sans-serif] bg-gray-100 overflow-hidden">
      {/* Desktop Sidebar: Always visible and static */}
      <aside
        className="
          hidden md:flex md:flex-col md:w-96 lg:w-[400px] 
          bg-gray-50 border-r border-gray-200
        "
      >
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-teal-700">Conversations</h2>
            {/* Optional: Link to Dashboard/Home for desktop sidebar */}
            <Link href="/dashboard" title="Back to Dashboard" className="text-teal-600 hover:text-teal-700">
                <Home size={22} />
            </Link>
        </div>
        <div className="flex-grow overflow-y-auto p-4 md:p-2"> {/* Adjusted padding for list items */}
          <SidebarContent
            chats={chats}
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            // onCloseSidebar is not needed if mobile doesn't use sliding sidebar
          />
        </div>
        <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">AnonMsg Chat Interface</p>
        </div>
      </aside>

      {/* Main Content Area: Shows Chat List or Chat View */}
      <main className="flex-grow flex flex-col relative overflow-hidden bg-white md:bg-gray-100">
        {/* Mobile Header: Only shown when chat list is visible on mobile */}
        <div className={`md:hidden p-4 bg-white border-b border-gray-200 flex justify-between items-center ${selectedChat ? 'hidden' : 'flex'}`}>
            <h1 className="text-xl font-semibold text-teal-600">My Chats</h1>
            {/* Optional: Link to Dashboard/Home for mobile header */}
            <Link href="/dashboard" title="Back to Dashboard" className="text-teal-600 hover:text-teal-700">
                <Home size={24} />
            </Link>
        </div>

        {/* On Mobile: Show Chat List (SidebarContent) if no chat is selected */}
        <div className={`md:hidden flex-grow overflow-y-auto p-2 ${selectedChat ? 'hidden' : 'block'}`}>
            <SidebarContent
                chats={chats}
                selectedChat={selectedChat}
                onChatSelect={handleChatSelect}
            />
        </div>
        
        {/* Chat View: Shown if a chat is selected (both mobile and desktop) */}
        {/* Or Desktop Placeholder: Shown if no chat is selected on desktop */}
        {selectedChat ? (
          <ChatView
            key={selectedChat.id}
            chat={selectedChat}
            onSendMessage={handleSendMessage}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            messagesEndRef={messagesEndRef}
            onBack={handleBackToChatList} // For mobile back button in ChatView header
            onOpenModal={openModal}
          />
        ) : (
          // Desktop placeholder (hidden on mobile because SidebarContent takes its place)
          <div className="hidden md:flex flex-col flex-grow items-center justify-center p-6 md:p-10 bg-white">
            <MessageSquareText className="w-24 h-24 text-teal-300 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Select a conversation</h2>
            <p className="text-gray-500">Choose a chat from the list to start messaging.</p>
            <div
                className="mt-8 w-64 h-64 md:w-80 md:h-80 bg-center bg-contain bg-no-repeat opacity-30"
                style={{ backgroundImage: `url(${MASK_IMAGE_URL})` }}
                role="img"
                aria-label="Anonymous Mask Illustration"
            ></div>
          </div>
        )}
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={handleConfirmModal}
        title={modalContent.title}
        confirmButtonText={modalContent.confirmText}
        isDestructive={modalContent.isDestructive}
      >
        {modalContent.bodyText && <p className="text-gray-600 text-sm">{modalContent.bodyText}</p>}
      </Modal>
    </div>
  );
};

export default ChatPage;