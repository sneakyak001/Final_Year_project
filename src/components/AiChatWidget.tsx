import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Activity, Loader2, Bot } from 'lucide-react';
import { DiagnosisAgent } from '../agents/agents';
import type { DiagnosisOutput } from '../agents/types';
import './AiChatWidget.css';

const diagnosisAgent = new DiagnosisAgent();

interface ChatMessage {
    role: 'ai' | 'user';
    content: string;
    agentName?: string;
}

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', content: "Hello! I am Aura, your clinical AI assistant — powered by DiagnosisAgent. Describe your patient's symptoms and I'll analyse probable conditions." }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isThinking) return;

        const userText = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsThinking(true);

        try {
            const result = await diagnosisAgent.run({ symptoms: userText });

            let responseText: string;
            if (result.status === 'done' && result.data) {
                const data = result.data as DiagnosisOutput;
                const topConditions = data.conditions
                    .slice(0, 3)
                    .map(c => `• ${c.name} (${Math.round(c.confidence * 100)}% confidence, ICD-10: ${c.icd10})`)
                    .join('\n');

                responseText =
                    `Primary assessment: ${data.primaryDiagnosis}\n\n` +
                    `Differential diagnoses:\n${topConditions}\n\n` +
                    `Recommended investigations: ${data.recommendedTests.join(', ')}`;
            } else {
                responseText = 'DiagnosisAgent encountered an issue. Please try again or run the full pipeline from the AI Agents page.';
            }

            setMessages(prev => [...prev, {
                role: 'ai',
                content: responseText,
                agentName: 'DiagnosisAgent',
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: 'An error occurred. Please try again.',
                agentName: 'DiagnosisAgent',
            }]);
        } finally {
            setIsThinking(false);
        }
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
                                    <span className="text-sm text-muted">DiagnosisAgent · Clinical Assistant</span>
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
                                    <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                                        {msg.content}
                                        {msg.agentName && (
                                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.65, fontSize: 11 }}>
                                                <Bot size={10} /> {msg.agentName}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isThinking && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-bubble-container ai-msg">
                                    <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Loader2 size={14} className="spin" />
                                        <span style={{ fontSize: 12 }}>DiagnosisAgent is analysing…</span>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="e.g. fever 38°C, cough, chest pain…"
                                className="input-field"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                disabled={isThinking}
                            />
                            <button type="submit" className="chat-send-btn" disabled={!inputValue.trim() || isThinking}>
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
