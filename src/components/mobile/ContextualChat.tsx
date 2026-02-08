'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphNode } from '@/types/graph';
import { ArrowLeft, Mic, Send, Sparkles } from 'lucide-react';

interface ContextualChatProps {
    node: GraphNode;
    onBack: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    actions?: { label: string; action: string }[];
}

// Format volume
function formatVolume(value: number): string {
    if (!value || value === 0) return '$0';
    if (value > 1e12) value = value / 1e18;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

export function ContextualChat({ node, onBack }: ContextualChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial AI message
    useEffect(() => {
        setIsTyping(true);
        const timer = setTimeout(() => {
            setMessages([{
                id: '1',
                role: 'ai',
                content: `I see you've been interacting with ${node.label}. You've had ${node.txCount || 0} transactions totaling ${formatVolume(node.value || 0)}. What would you like to know about this connection?`,
                actions: [
                    { label: 'Analyze pattern', action: 'analyze' },
                    { label: 'Risk assessment', action: 'risk' },
                ],
            }]);
            setIsTyping(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [node]);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: getAIResponse(input, node),
                actions: [
                    { label: 'Tell me more', action: 'more' },
                ],
            };
            setMessages((prev) => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1500);
    };

    const handleAction = (action: string) => {
        const actionMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: action === 'analyze' ? 'Analyze the pattern' : action === 'risk' ? 'Give me a risk assessment' : 'Tell me more',
        };
        setMessages((prev) => [...prev, actionMessage]);
        setIsTyping(true);

        setTimeout(() => {
            const response = action === 'analyze'
                ? `Looking at your transaction pattern with ${node.label}, I notice you typically interact during high-volume periods. Your average transaction is ${formatVolume((node.value || 0) / (node.txCount || 1))}. This suggests a ${(node.txCount || 0) > 20 ? 'high-frequency trading' : 'strategic investing'} approach.`
                : action === 'risk'
                    ? `Risk Assessment for ${node.label}:\n\n• Exposure: ${formatVolume(node.value || 0)}\n• Transaction frequency: ${(node.txCount || 0) > 10 ? 'High' : 'Moderate'}\n• Pattern: ${node.type === 'exchange' ? 'Exchange-based activity (lower risk)' : 'Direct wallet transfers (verify recipient)'}\n\nOverall: ${(node.value || 0) > 10000 ? 'Consider diversifying' : 'Within normal range'}`
                    : `I can help you understand your relationship with ${node.label} better. What specific aspect interests you?`;

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response,
            };
            setMessages((prev) => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-black">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-800"
                style={{ background: 'rgba(15,15,20,0.95)' }}
            >
                <button onClick={onBack} className="p-2 -ml-2">
                    <ArrowLeft size={22} className="text-gray-400" />
                </button>
                <div className="flex-1">
                    <Sparkles size={16} className="inline text-purple-400 mr-2" />
                    <span className="text-white font-medium">AI Assistant</span>
                </div>
            </div>

            {/* Pinned Context Card */}
            <div
                className="mx-4 mt-3 p-3 rounded-xl flex items-center gap-3"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                    {node.type === 'exchange' ? '🏦' : '👛'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{node.label}</p>
                    <p className="text-gray-500 text-xs">{node.txCount || 0} txns • {formatVolume(node.value || 0)}</p>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'rounded-br-md'
                                        : 'rounded-bl-md'
                                    }`}
                                style={{
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                                        : 'rgba(255,255,255,0.08)',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>

                                {/* Action buttons */}
                                {msg.actions && msg.actions.length > 0 && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        {msg.actions.map((action) => (
                                            <button
                                                key={action.action}
                                                onClick={() => handleAction(action.action)}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div
                            className="px-4 py-3 rounded-2xl rounded-bl-md"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                        >
                            <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{
                                            duration: 1,
                                            repeat: Infinity,
                                            delay: i * 0.2,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
                <div
                    className="flex items-center gap-2 p-2 rounded-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a follow-up..."
                        className="flex-1 bg-transparent px-3 py-2 text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Mic size={20} />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-2 rounded-full bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="h-6" /> {/* Safe area */}
            </div>
        </div>
    );
}

// Helper function for demo AI responses
function getAIResponse(input: string, node: GraphNode): string {
    const lower = input.toLowerCase();

    if (lower.includes('why') || lower.includes('reason')) {
        return `Based on the transaction pattern with ${node.label}, this appears to be ${node.type === 'exchange' ? 'exchange activity' : 'direct transfers'}. The timing suggests ${(node.txCount || 0) > 10 ? 'regular interaction' : 'occasional use'}.`;
    }

    if (lower.includes('should') || lower.includes('recommend')) {
        return `Given your current position with ${node.label}:\n\n1. Your exposure of ${formatVolume(node.value || 0)} is ${(node.value || 0) > 10000 ? 'significant' : 'moderate'}\n2. Consider setting up alerts for large movements\n3. Review your transaction history quarterly`;
    }

    return `I understand you're asking about ${input}. Based on your ${node.txCount || 0} transactions with ${node.label}, I can provide insights on patterns, risks, or specific transactions. What would be most helpful?`;
}
