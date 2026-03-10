import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Activity } from 'lucide-react';
import './AiChatWidget.css';

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Aura, your clinical AI assistant. How can I help you today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        setMessages([...messages, { role: 'user', content: inputValue }]);
        setInputValue('');

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: 'Analyzing request... Based on clinical guidelines, please review the latest patient vitals or select a recent X-Ray for automated bounding box detection.'
            }]);
        }, 1000);
    };

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="chat-fab-btn"
                        onClick={() => setIsOpen(true)}
                    >
                        <MessageSquare size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
                        className="chat-widget-panel card"
                    >
                        <div className="chat-header">
                            <div className="flex items-center gap-3">
                                <div className="chat-avatar bg-accent-blue">
                                    <Activity size={18} color="white" />
                                </div>
                                <div>
                                    <h4 className="fw-700 m-0">Aura AI</h4>
                                    <span className="text-sm text-muted">Clinical Assistant</span>
                                </div>
                            </div>
                            <button className="icon-btn-small" onClick={() => setIsOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className={`chat-bubble-container ${msg.role === 'ai' ? 'ai-msg' : 'user-msg'}`}
                                >
                                    <div className="chat-bubble">
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="Ask clinical questions..."
                                className="input-field"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                            />
                            <button type="submit" className="chat-send-btn" disabled={!inputValue.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
