import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User } from 'lucide-react';
import { blogPosts } from '../utils/blogData';
import { formatDate } from '../utils/dateUtils';

const BlogList: React.FC = () => {
  const navigate = useNavigate();

  // Scroll to top on mount to ensure user starts reading from the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800">
      
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-[#052e16] font-bold text-sm mb-10 transition-colors focus:outline-none group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      {/* Title Area */}
      <div className="mb-16 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#052e16] mb-4">
          Nunma Blog &amp; Insights
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl">
          Actionable resources and strategies to help tuition centres, coaching classes, and educators digitize and scale.
        </p>
      </div>

      {/* Vertical Scroll List */}
      <div className="space-y-12">
        {blogPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/blog/${post.id}`)}
            className="flex flex-col md:flex-row gap-8 bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:shadow-xl transition-all duration-500 cursor-pointer group"
          >
            {/* Image Container */}
            <div className="w-full md:w-1/3 aspect-[16/10] md:aspect-[4/3] rounded-[2rem] overflow-hidden relative shrink-0">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Text details */}
            <div className="flex flex-col justify-between py-2 flex-grow">
              <div>
                {/* Meta details */}
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400 mb-4 items-center">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(post.date)}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {post.readTime}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {post.author}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#1a1a4e] tracking-tight mb-4 group-hover:text-[#052e16] transition-colors leading-tight">
                  {post.title}
                </h2>
                
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                  {post.excerpt}
                </p>
              </div>

              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/blog/${post.id}`);
                  }}
                  className="bg-slate-50 hover:bg-[#c2f575] text-[#052e16] px-6 py-2.5 rounded-full font-bold text-xs transition-all border border-slate-100 hover:border-[#c2f575] focus:outline-none"
                >
                  Read Full Article
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default BlogList;
