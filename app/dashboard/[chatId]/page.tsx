"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import ChatView from '../../Components/ChatView';
import Modal from '../../Components/Modal';
import { useDashboard } from '../layout'; 

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const chatId = params.chatId as string;
    const { getChatById, sendMessage, logout, deleteChat } = useDashboard();
    
    const chat = getChatById(chatId);

    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatModalContent, setChatModalContent] = useState<{
      title: string; confirmText: string; action: 'delete' | 'logout' | 'close_chat' | null;
      bodyText?: string; isDestructive?: boolean;
    }>({ title: '', confirmText: '', action: null, bodyText: '', isDestructive: false });

    useEffect(() => {
        if (chat?.messages?.length) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chat?.messages, chatId]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        sendMessage(chatId, newMessage);
        setNewMessage('');
    };

    const handleOpenChatActionModal = (action: 'delete' | 'logout' | 'close_chat') => {
        if (!chat && action !== 'logout') return;
        if (action === 'logout') {
            setChatModalContent({ title: 'Logout?', bodyText: 'Are you sure you want to logout?', confirmText: 'Logout', action, isDestructive: true });
        } else if (chat) {
            if (action === 'delete') {
                setChatModalContent({ title: 'Delete Chat?', bodyText: `Delete chat with ${chat.sender}? This action cannot be undone.`, confirmText: 'Delete', action, isDestructive: true });
            } else if (action === 'close_chat') {
                setChatModalContent({ title: 'Close Chat?', bodyText: `Close the chat with ${chat.sender}? You can reopen it from the sidebar.`, confirmText: 'Close', action, isDestructive: false });
            }
        }
        setIsChatModalOpen(true);
    };
    
    const handleConfirmChatModal = async () => {
        const { action } = chatModalContent;
        setIsChatModalOpen(false);
        if (action === 'logout') {
            logout();
        } else if (chat && action === 'delete') {
            await deleteChat(chat.id.toString());
            router.push('/dashboard');
        } else if (action === 'close_chat') { 
            router.push('/dashboard');
        }
    };
    
    if (!chat) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-6 bg-white text-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading conversation, or chat not found...</p>
            </div>
        );
    }

    return (
        <>
            <ChatView
                key={chat.id}
                chat={chat}
                onSendMessage={handleSendMessage}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                messagesEndRef={messagesEndRef}
                onBack={() => router.push('/dashboard')}
                onOpenModal={handleOpenChatActionModal}
            />
            <Modal isOpen={isChatModalOpen} onClose={() => setIsChatModalOpen(false)} onConfirm={handleConfirmChatModal} title={chatModalContent.title} confirmButtonText={chatModalContent.confirmText} isDestructive={chatModalContent.isDestructive ?? false}>
                {chatModalContent.bodyText && <p className="text-gray-600 text-sm">{chatModalContent.bodyText}</p>}
            </Modal>
        </>
    );
}