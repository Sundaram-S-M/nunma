
import React, { useState } from 'react';
import { Search as SearchIcon, ChevronDown, Check, XCircle } from 'lucide-react';

const Search: React.FC = () => {
  const [type, setType] = useState<'Tutor' | 'Zone'>('Tutor');
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setIsSearched(true);
    // Mocking an empty search result
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-12 flex flex-col items-center pt-12">
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl relative z-40 transition-all focus-within:ring-2 focus-within:ring-[#c1e60d]/50">
        <input 
          type="text" 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (isSearched) setIsSearched(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search for a ${type}...`} 
          className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-lg font-bold text-[#1A1A4E] placeholder:text-gray-300"
        />
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-all border border-gray-100"
          >
            {type} <ChevronDown size={18} className={showDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
              {(['Tutor', 'Zone'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => { setType(option); setShowDropdown(false); }}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between text-sm font-bold transition-all
                    ${type === option ? 'bg-[#c1e60d]/10 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  {option}
                  {type === option && <Check size={16} className="text-[#c1e60d]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isSearched && results.length === 0 ? (
        <div className="text-center py-24 text-gray-300 animate-in fade-in zoom-in duration-500">
          <XCircle size={100} strokeWidth={1} className="mx-auto mb-6 text-gray-200" />
          <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest mb-2">No Results Found</h3>
          <p className="text-gray-400 font-medium italic">We couldn't find any {type.toLowerCase()}s matching "{query}"</p>
          <button 
            onClick={() => setIsSearched(false)}
            className="mt-8 text-[10px] font-black uppercase text-indigo-900 bg-[#c1e60d] px-6 py-2 rounded-full tracking-widest shadow-sm hover:shadow-md transition-all"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="text-center py-24 text-gray-300 animate-in fade-in duration-700">
          <SearchIcon size={120} strokeWidth={1} className="mx-auto mb-8 opacity-10" />
          <h3 className="text-3xl font-black uppercase tracking-widest text-gray-200">Search</h3>
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-2">Find experts and learning zones across the platform</p>
        </div>
      )}
    </div>
  );
};

export default Search;
