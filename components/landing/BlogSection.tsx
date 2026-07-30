import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { blogPosts } from '../../utils/blogData';
import { formatDate } from '../../utils/dateUtils';

const BlogSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="blogs" className="bg-[#fcfcfc] py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#7cc142]"></span>
            <span>Resources & Insights</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-nunma-forest tracking-tight mb-4 max-w-3xl">
            Latest Articles & Guides
          </h2>
          <p className="text-gray-500 font-bold text-base max-w-xl">
            Tips, updates, and best practices for educators and tuition centres.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {blogPosts.slice(0, 3).map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/blog/${post.id}`)}
              className="bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-5 bg-gray-100">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="px-2 pb-2">
                  <div className="text-xs font-bold text-gray-400 mb-3">{formatDate(post.date)}</div>
                  <h4 className="font-extrabold text-[#1a1a4e] text-[15px] leading-snug mb-4 line-clamp-2 min-h-[40px]">
                    {post.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </div>
              <div className="px-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/blog/${post.id}`);
                  }}
                  className="text-xs font-bold text-[#052e16] hover:text-[#c2f575] underline underline-offset-4 decoration-2 decoration-[#c2f575]/50 transition-colors focus:outline-none"
                >
                  Read Article
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default BlogSection;
