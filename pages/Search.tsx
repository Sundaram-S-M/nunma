import React, { useState } from 'react';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ChevronDown, Check, XCircle } from 'lucide-react';

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'People' | 'Zone'>('People');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearched(true);
    setSearchLoading(true);
    setResults([]);

    try {
      const qText = searchQuery.trim();
      let q;

      if (!db) {
        console.error("Firestore is not initialized");
        setSearchLoading(false);
        return;
      }

      if (type === 'People') {
        // Simple prefix search for users by name
        q = query(
          collection(db, 'users'),
          // removed role filter to allow searching all users
          where('name', '>=', qText),
          where('name', '<=', qText + '\uf8ff'),
          limit(20)
        );
      } else {
        // Simple prefix search for zones by title
        q = query(
          collection(db, 'zones'),
          where('title', '>=', qText),
          where('title', '<=', qText + '\uf8ff'),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const hits = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setResults(hits);

    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-12 flex flex-col items-center pt-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl relative z-40 transition-all focus-within:ring-2 focus-within:ring-[#c1e60d]/50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (isSearched) setIsSearched(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search for ${type === 'People' ? 'people' : 'a zone'}...`}
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
              {(['People', 'Zone'] as const).map(option => (
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
        <button
          onClick={handleSearch}
          className="bg-[#1A1A4E] text-white p-3 rounded-xl hover:bg-indigo-900 transition-all"
        >
          <SearchIcon size={20} />
        </button>
      </div>

      {isSearched && (
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-[#1A1A4E]">Results ({results.length})</h3>
            <button onClick={() => { setSearchQuery(''); setIsSearched(false); setResults([]); }} className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest">Clear</button>
          </div>

          {searchLoading ? (
            <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#c1e60d] border-t-transparent rounded-full animate-spin"></div></div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(type === 'People' ? `/profile/${item.id}` : `/classroom/zone/${item.id}`)}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:shadow-xl hover:border-[#c1e60d]/50 transition-all cursor-pointer group flex items-center gap-6"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden shrink-0">
                    <img src={item.avatar || item.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[#1A1A4E] group-hover:text-indigo-600 transition-colors line-clamp-1">{item.name || item.title}</h4>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 line-clamp-1">{item.headline || item.description || (type === 'People' ? 'Member' : 'Learning Zone')}</p>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                    <div className="w-10 h-10 rounded-full bg-[#c1e60d] flex items-center justify-center text-[#1A1A4E]">
                      <ChevronDown size={20} className="-rotate-90" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 opacity-50">
              <XCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No matching {type.toLowerCase()}s found</p>
            </div>
          )}
        </div>
      )}

      {!isSearched && (
        <div className="text-center py-12 text-gray-300">
          <SearchIcon size={120} strokeWidth={1} className="mx-auto mb-8 opacity-10" />
          <h3 className="text-3xl font-black uppercase tracking-widest text-gray-200">Search Discovery</h3>
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-2">Find experts and learning zones across the platform</p>
        </div>
      )}
    </div>
  );
};
export default Search;
