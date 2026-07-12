import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { blogPosts } from '../../utils/blogData';

const BlogSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="blogs" className="bg-[#fcfcfc] py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
            <span>✨</span> Blogs
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#000000] mb-6 tracking-tight">
            Explore Our Latest Blogs &amp; Insights
          </h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Stay ahead in digital education — discover trends, teaching strategies, and product
            updates designed to help educators and students thrive.
          </p>
        </div>

        {/* Sub-header row */}
        <div className="flex justify-between items-end mb-8">
          <h3 className="font-extrabold text-lg text-[#000000]">Featured Blogs</h3>
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-[#052e16] font-bold text-sm hover:text-[#c2f575] transition-colors focus:outline-none"
          >
            View all blogs <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {blogPosts.slice(0, 4).map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/blog/${post.id}`)}
              className="bg-[#f8fcf9] border border-gray-100 rounded-3xl p-4 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="px-2 pb-2">
                <div className="text-xs font-bold text-gray-400 mb-3">{post.date}</div>
                <h4 className="font-extrabold text-[#1a1a4e] text-[15px] leading-snug mb-4 line-clamp-2 min-h-[40px]">
                  {post.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
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
