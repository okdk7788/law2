import { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

function SearchSection({ type, searches, setSearches, active, addSearch, onSearchComplete, loading, setLoading }) {
  const [searchTimeout, setSearchTimeout] = useState({});

  const handleSearch = async (index, term) => {
    if (!term) return;

    setLoading({ ...loading, [index]: 'search' });
    try {
      const response = await fetch(`/api/search_law`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_term: term,
          source: type === 'law' ? 'law' : 'rule',
          key_prefix: type,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Search response:', data);

      const updatedSearches = searches.map(s =>
        s.id === index ? { ...s, term, results: data.results, content: data.content, completed: data.completed } : s
      );
      setSearches(updatedSearches);
      console.log('Updated searches:', updatedSearches);
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading({ ...loading, [index]: null });
    }
  };

  const handleInputChange = (index, value) => {
    const newSearches = searches.map(s =>
      s.id === index ? { ...s, term: value } : s
    );
    setSearches(newSearches);

    if (searchTimeout[index]) {
      clearTimeout(searchTimeout[index]);
    }

    const timeout = setTimeout(() => {
      handleSearch(index, value);
    }, 1200);
    setSearchTimeout({ ...searchTimeout, [index]: timeout });
  };

  const handleSelect = async (index, selected) => {
    const selectedItem = searches.find(s => s.id === index).results.find(r => r.name === selected);
    if (!selectedItem) return;

    const updatedSearchesBeforeFetch = searches.map(s =>
      s.id === index ? { ...s, selected } : s
    );
    setSearches(updatedSearchesBeforeFetch);
    
    setLoading({ ...loading, [index]: 'fetch' });
    try {
      const response = await fetch(
        `/api/fetch_law_content/${type === 'law' ? 'law' : 'rule'}/${selectedItem.id}/${type}_${index}`
      );
      const data = await response.json();
      const updatedSearches = searches.map(s =>
        s.id === index ? { ...s, selected, content: data.content, completed: data.completed } : s
      );
      setSearches(updatedSearches);
      if (data.completed && onSearchComplete) {
        onSearchComplete(selected, type);
      }
    } catch (error) {
      console.error('Fetch content error:', error);
      alert('내용 가져오기 중 오류가 발생했습니다.');
    } finally {
      setLoading({ ...loading, [index]: null });
    }
  };

  const clearSearch = (index) => {
    setSearches(searches.filter(s => s.id !== index));
    setLoading({ ...loading, [index]: null }); // 로딩 상태도 제거
  };

  useEffect(() => {
    return () => {
      Object.values(searchTimeout).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className={`search-section ${active ? 'active' : ''}`}>
      {searches.map(({ id, term, results, selected, completed }) => (
        <div key={id} className="mb-4">
          {completed ? (
            <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center">
              <span>{selected || term} 수집 완료</span>
              <button onClick={() => clearSearch(id)} className="ml-auto text-red-500 hover:text-red-700">
                <FaTimes />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder={type === 'law' ? `법령 ${id} 검색 (예: 민법)` : `행정규칙 ${id} 검색 (예: 금융투자업규정)`}
                    value={term}
                    onChange={(e) => handleInputChange(id, e.target.value)}
                    className="w-full py-2 px-4 rounded-full bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <FaSearch className="absolute right-3 top-3 text-insta-blue" />
                </div>
                <button
                  onClick={() => clearSearch(id)}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <FaTimes />
                </button>
              </div>
              {loading[id] === 'search' && (
                <div className="flex items-center">
                  <img src="/spinner.svg" alt="Loading" className="w-5 h-5 animate-spin mr-2" />
                  <span>검색 중...</span>
                </div>
              )}
            </div>
          )}
          {results.length === 0 && term && !loading[id] && (
            <p className="mt-2 text-red-500">검색 결과가 없습니다.</p>
          )}
          {results.length > 0 && !completed && (
            <div className="mt-2">
              {selected && loading[id] === 'fetch' ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-800">{selected}</div>
                  <div className="flex items-center mt-2">
                    <img src="/spinner.svg" alt="Loading" className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-blue-600">법령데이터를 수집 중입니다...</span>
                  </div>
                </div>
              ) : (
                <select
                  value={selected || ''}
                  onChange={(e) => handleSelect(id, e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-insta-blue"
                >
                  <option value="">선택하세요</option>
                  {results.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      ))}
      {searches.length < 4 && (
        <button
          onClick={addSearch}
          className="bg-insta-blue text-white px-4 py-2 rounded-full hover:bg-insta-dark-blue w-full"
        >
          {type === 'law' ? '법령 추가' : '행정규칙 추가'}
        </button>
      )}
    </div>
  );
}

export default SearchSection;