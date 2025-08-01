import { useEffect, useRef } from 'react';
import Message from './Message';

function ChatWindow({ messages, setMessages, chatInput, setChatInput, sessionId, lawContents, ruleContents, isLoading }) {
  const chatRef = useRef(null);

  useEffect(() => {
    console.log('ChatWindow rendered, messages:', messages, 'isLoading:', isLoading);
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
    console.log('Scrolled to page bottom');
  }, [messages, isLoading]);

  return (
    <div ref={chatRef} className="chat-container">
      <div className="space-y-3 p-4">
        {messages.length === 0 && !isLoading && (
          <Message
            id="welcome"
            role="assistant"
            content="현행 대한민국 법령을 근거로 답변합니다."
          />
        )}
        {messages.map((msg) => (
          <Message key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <div className="spinner-container flex items-center p-3 bg-blue-100 rounded-lg">
            <img src="/spinner.svg" alt="Loading" className="spinner w-6 h-6 mr-2" />
            <span className="text-gray-800">답변 준비중 입니다...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;