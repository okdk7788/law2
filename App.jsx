import { useState, useEffect } from 'react';
import { FaBalanceScale, FaHome, FaCompass, FaEnvelope, FaRobot, FaPaperPlane, FaExternalLinkAlt } from 'react-icons/fa';
import SearchSection from './components/SearchSection';
import ChatWindow from './components/ChatWindow';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [activeTab, setActiveTab] = useState('law');
  const [sessionId, setSessionId] = useState(uuidv4());
  const [lawSearches, setLawSearches] = useState([{ id: 1, term: '', results: [], selected: null, content: '', completed: false }]);
  const [ruleSearches, setRuleSearches] = useState([{ id: 1, term: '', results: [], selected: null, content: '', completed: false }]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    return JSON.parse(localStorage.getItem('recentSearches')) || [];
  });
  // === 추가: 로딩 상태 관리 ===
  const [lawLoading, setLawLoading] = useState({});
  const [ruleLoading, setRuleLoading] = useState({});

  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const addSearch = (type) => {
    const newId = (type === 'law' ? lawSearches : ruleSearches).length + 1;
    if (newId <= 4) {
      const newSearch = { id: newId, term: '', results: [], selected: null, content: '', completed: false };
      if (type === 'law') {
        setLawSearches([...lawSearches, newSearch]);
      } else {
        setRuleSearches([...ruleSearches, newSearch]);
      }
    }
  };

  const updateRecentSearches = (name, type) => {
    if (!name) return;
    setRecentSearches((prev) => {
      const updated = [{ name, type }, ...prev.filter((search) => search.name !== name)].slice(0, 4);
      return updated;
    });
  };

  const clearAll = async () => {
    setLawSearches([{ id: 1, term: '', results: [], selected: null, content: '', completed: false }]);
    setRuleSearches([{ id: 1, term: '', results: [], selected: null, content: '', completed: false }]);
    setMessages([]);
    setLawLoading({}); // 로딩 상태 초기화
    setRuleLoading({}); // 로딩 상태 초기화
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    try {
      await fetch(`/api/clear_session/${sessionId}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) {
      console.log('Input is empty, skipping sendMessage');
      return;
    }
    console.log('Calling sendMessage with input:', chatInput);
    sendMessage();
  };

  const sendMessage = async () => {
    console.log('sendMessage triggered');
    const input = chatInput.trim();
    if (!input) return;
    const newMessages = [...messages, { id: uuidv4(), role: 'user', content: input }];
    setMessages(newMessages);
    setChatInput('');
    setIsLoading(true);
    const payload = {
      session_id: sessionId,
      question: input,
      law_contents: lawSearches.map(s => s.content).concat(['', '', '','']).slice(0, 4),
      rule_contents: ruleSearches.map(s => s.content).concat(['', '', '','']).slice(0, 4),
    };
    try {
      console.log('Sending POST request to /chat_stream with payload:', payload);
      const response = await fetch(`/api/chat_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      let aiAnswer = '';
      const assistantMessageId = uuidv4();
      setMessages([...newMessages, { id: assistantMessageId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete, final answer:', aiAnswer);
          setIsLoading(false);
          break;
        }
        const chunk = new TextDecoder().decode(value);
        console.log('Received chunk:', chunk);
        aiAnswer += chunk;
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.findIndex(msg => msg.id === assistantMessageId);
          if (lastMessageIndex !== -1) {
            updatedMessages[lastMessageIndex] = { ...updatedMessages[lastMessageIndex], content: aiAnswer };
          }
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setMessages(prevMessages => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          return [...prevMessages.slice(0, -1), { ...lastMessage, content: '답변 생성 중 오류가 발생했습니다.' }];
        } else {
          return [...prevMessages, { id: uuidv4(), role: 'assistant', content: '답변 생성 중 오류가 발생했습니다.' }];
        }
      });
      setIsLoading(false);
    }
  };

  const getLawUrl = (name, type) => {
    const encodedName = encodeURIComponent(name);
    return type === 'law'
      ? `https://www.law.go.kr/법령/${encodedName}`
      : `https://www.law.go.kr/행정규칙/${encodedName}`;
  };

  const handleRecentSearchSelect = async (name, type) => {
    console.log(`Handling recent search select for: ${name}, type: ${type}`);
    setActiveTab(type);

    const targetIndex = 0;
    const searches = type === 'law' ? lawSearches : ruleSearches;
    const setSearches = type === 'law' ? setLawSearches : setRuleSearches;
    const setLoading = type === 'law' ? setLawLoading : setRuleLoading;

    try {
      // === 수정: 검색 시작 시 로딩 상태 설정 ===
      setLoading(prev => ({ ...prev, [searches[targetIndex].id]: 'search' }));

      let updatedSearches = searches.map((s, i) =>
        i === targetIndex ? { ...s, term: name, results: [], selected: null, content: '', completed: false } : s
      );
      setSearches(updatedSearches);

      const searchResponse = await fetch(`/api/search_law`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_term: name,
          source: type === 'law' ? 'law' : 'rule',
          key_prefix: type,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error(`Search API error! status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      console.log('Search results:', searchData);

      if (!searchData.results || searchData.results.length === 0) {
        console.warn('No search results found');
        alert(`${name}에 대한 검색 결과가 없습니다.`);
        updatedSearches = searches.map((s, i) =>
          i === targetIndex ? { ...s, term: name, results: [], selected: null, completed: false } : s
        );
        setSearches(updatedSearches);
        setLoading(prev => ({ ...prev, [searches[targetIndex].id]: null }));
        return;
      }

      const selectedItem = searchData.results.find(r => r.name === name) || searchData.results[0];
      console.log('Selected item:', selectedItem);

      updatedSearches = searches.map((s, i) =>
        i === targetIndex ? {
          ...s,
          term: name,
          results: searchData.results,
          selected: selectedItem.name,
          content: '',
          completed: false
        } : s
      );
      setSearches(updatedSearches);
      // === 수정: 검색 로딩 종료, 콘텐츠 가져오기 로딩 시작 ===
      setLoading(prev => ({ ...prev, [searches[targetIndex].id]: 'fetch' }));

      console.log(`Fetching content for ${selectedItem.name} (ID: ${selectedItem.id}, type: ${type})`);
      const keySuffix = searches[targetIndex].id || 1;
      const contentResponse = await fetch(
        `/api/fetch_law_content/${type === 'law' ? 'law' : 'rule'}/${selectedItem.id}/${type}_${keySuffix}`
      );

      if (!contentResponse.ok) {
        throw new Error(`Content fetch API error! status: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      console.log('Fetched content data:', contentData);

      updatedSearches = searches.map((s, i) =>
        i === targetIndex ? {
          ...s,
          term: name,
          results: searchData.results,
          selected: selectedItem.name,
          content: contentData.content || '내용을 불러오지 못했습니다.',
          completed: contentData.completed
        } : s
      );
      setSearches(updatedSearches);

      if (contentData.completed) {
        updateRecentSearches(selectedItem.name, type);
      }
    } catch (error) {
      console.error('Error handling recent search selection:', error);
      alert('법령/규칙 데이터를 가져오는 중 오류가 발생했습니다: ' + error.message);
      const finalSearches = searches.map((s, i) =>
        i === targetIndex ? { ...s, term: name, results: [], selected: null, content: '오류 발생', completed: false } : s
      );
      setSearches(finalSearches);
    } finally {
      // === 수정: 모든 경우에 로딩 상태 해제 ===
      setLoading(prev => ({ ...prev, [searches[targetIndex].id]: null }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-gradient text-white shadow-lg z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaBalanceScale className="text-2xl text-insta-dark-blue" />
              <h1 className="text-xl font-bold text-insta-dark-blue">법령기반 GPT<span className="text-sm font-normal">#노대길 변호사</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <a href="#" className="text-white hover:text-insta-light-blue"><FaHome /></a>
              <a href="#" className="text-white hover:text-insta-light-blue"><FaCompass /></a>
              <a href="#" className="text-white hover:text-insta-light-blue"><FaEnvelope /></a>
            </div>
          </div>
          <div className="search-tabs mb-4">
            <div
              className={`search-tab ${activeTab === 'law' ? 'active' : ''}`}
              onClick={() => handleTabChange('law')}
            >
              법령검색
            </div>
            <div
              className={`search-tab ${activeTab === 'regulation' ? 'active' : ''}`}
              onClick={() => handleTabChange('regulation')}
            >
              행정규칙 검색
            </div>
          </div>
          <SearchSection
            type="law"
            searches={lawSearches}
            setSearches={setLawSearches}
            active={activeTab === 'law'}
            addSearch={() => addSearch('law')}
            onSearchComplete={updateRecentSearches}
            loading={lawLoading} // === 추가: 로딩 상태 전달 ===
            setLoading={setLawLoading} // === 추가: 로딩 상태 설정 함수 전달 ===
          />
          <SearchSection
            type="regulation"
            searches={ruleSearches}
            setSearches={setRuleSearches}
            active={activeTab === 'regulation'}
            addSearch={() => addSearch('regulation')}
            onSearchComplete={updateRecentSearches}
            loading={ruleLoading} // === 추가: 로딩 상태 전달 ===
            setLoading={setRuleLoading} // === 추가: 로딩 상태 설정 함수 전달 ===
          />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 flex-grow pb-20">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-insta-dark-blue mb-3">최근 검색</h2>
          {recentSearches.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentSearches.map(({ name, type }, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-insta-blue to-insta-dark-blue text-white rounded-lg p-3 text-center hover:shadow-lg transition cursor-pointer"
                  onClick={() => handleRecentSearchSelect(name, type)}
                >
                  <FaBalanceScale className="text-base mb-2 mx-auto" />
                  <p className="text-sm font-medium mb-2 line-clamp-2 break-words">{name}</p>
                  <div className="flex justify-center">
                    <a
                      href={getLawUrl(name, type)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-insta-blue text-white text-xs px-2 py-1 rounded hover:bg-insta-dark-blue"
                      onClick={(e) => e.stopPropagation()}
                    >
                      내용 <FaExternalLinkAlt className="ml-1 text-xs" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">최근 검색한 법령이 없습니다.</p>
          )}
        </div>
        {isChatOpen && (
          <section className="chat-section mb-6">
            <ChatWindow
              messages={messages}
              sessionId={sessionId}
              lawContents={lawSearches.map(s => s.content).concat(['', '', '','']).slice(0, 4)}
              ruleContents={ruleSearches.map(s => s.content).concat(['', '', '','']).slice(0, 4)}
              isLoading={isLoading}
            />
          </section>
        )}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-blue-gradient text-white p-3 shadow-xl z-20">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold"><FaRobot className="inline mr-2" />법률 챗봇</h3>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-white hover:text-insta-light-blue">
            <i className={`fas fa-chevron-${isChatOpen ? 'down' : 'up'}`}></i>
          </button>
        </div>
        {isChatOpen && (
          <div className="mt-3 flex items-center chat-input-container">
            <input
              type="text"
              placeholder="메시지를 입력하세요..."
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                console.log('Input changed:', e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && chatInput.trim()) {
                  console.log('Enter key pressed');
                  handleSendMessage();
                }
              }}
              className="flex-grow py-2 px-3 rounded-full bg-blue-900 bg-opacity-30 text-white placeholder-blue-200 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              className={`ml-2 bg-white text-insta-blue rounded-full p-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-insta-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <FaPaperPlane />
              )}
            </button>
          </div>
        )}
      </div>
      <div className="fixed top-4 right-4 z-30">
        <button
          onClick={clearAll}
          className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 shadow-lg"
        >
          전체 초기화
        </button>
      </div>
    </div>
  );
}

export default App;