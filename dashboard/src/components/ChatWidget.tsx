"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWidget.module.css';
import { useAppContext } from './AppContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const { chatTrigger, setChatTrigger, isChatOpen, setIsChatOpen } = useAppContext();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi there! I'm FinanceBot. I've been reading your feeds and tracking your portfolio—how can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);

  const handleSend = useCallback(async (forcedInput?: string | React.MouseEvent | React.KeyboardEvent) => {
    // If it's an event object, ignore it
    const textToSend = (typeof forcedInput === 'string' ? forcedInput : input.trim());
    if (!textToSend || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (typeof forcedInput !== 'string') setInput('');
    setIsLoading(true);

    try {
      // Check if it's an explanation request
      const explainMatch = textToSend.match(/^Explain today's move for ([A-Z0-9]+)$/i);
      
      if (explainMatch) {
        const ticker = explainMatch[1].toUpperCase();
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });

        if (!res.ok) throw new Error('Network error');
        if (!res.body) throw new Error('No body stream');

        setIsLoading(false); // Stop loading animation since we're streaming
        
        // Add empty assistant message to start appending to
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.substring(6));
                  const text = data.choices?.[0]?.delta?.content || '';
                  if (text) {
                    setMessages(prev => {
                      const updated = [...prev];
                      updated[updated.length - 1].content += text;
                      return updated;
                    });
                  }
                } catch (e) {
                  // Ignore JSON parse errors on partial chunks
                }
              }
            }
          }
        }
      } else {
        // Standard non-streaming chat
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (!res.ok) throw new Error('Network error');

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops, something went wrong. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  useEffect(() => {
    if (chatTrigger) {
      setIsChatOpen(true);
      handleSend(chatTrigger);
      setChatTrigger(null);
    }
  }, [chatTrigger, handleSend, setChatTrigger, setIsChatOpen]);

  return (
    <>
      {isChatOpen && (
        <div className={styles.overlay} onClick={() => setIsChatOpen(false)}></div>
      )}

      <div className={`${styles.sidebar} ${isChatOpen ? styles.open : ''}`}>
        <div className={styles.chatHeader}>
          <div className={styles.headerTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '12px'}}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Finance AI
          </div>
          <button className={styles.closeBtn} onClick={() => setIsChatOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className={styles.messagesContainer}>
          {messages.map((m, idx) => (
            <div key={idx} className={`${styles.messageWrapper} ${m.role === 'user' ? styles.userWrapper : styles.aiWrapper}`}>
              <div className={`${styles.messageBubble} ${m.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                {m.role === 'assistant' ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.aiWrapper}`}>
              <div className={`${styles.messageBubble} ${styles.aiBubble} ${styles.loadingBubble}`}>
                <span className={styles.dot}></span><span className={styles.dot}></span><span className={styles.dot}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI anything..."
            className={styles.chatInput}
          />
          <button className={styles.sendBtn} onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </>
  );
}
