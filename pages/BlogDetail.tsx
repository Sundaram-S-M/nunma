import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, ChevronRight } from 'lucide-react';
import { blogPosts } from '../utils/blogData';
import { formatDate } from '../utils/dateUtils';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const post = blogPosts.find((p) => p.id === Number(id));

  // Scroll to top on load/change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center font-sans">
        <h1 className="text-3xl font-black text-slate-800 mb-4">Article Not Found</h1>
        <p className="text-slate-500 font-medium mb-8">The blog post you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/blog')}
          className="bg-[#052e16] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c2f575] hover:text-[#052e16] transition-colors focus:outline-none"
        >
          Back to Blogs
        </button>
      </div>
    );
  }

  // Get related/other posts (excluding current one)
  const relatedPosts = blogPosts.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <article className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-8 flex-wrap">
        <Link to="/" className="hover:text-[#052e16] transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <Link to="/blog" className="hover:text-[#052e16] transition-colors">Blogs</Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-600 truncate max-w-[250px] md:max-w-[400px]">
          {post.title}
        </span>
      </nav>

      {/* Back Button */}
      <button
        onClick={() => navigate('/blog')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-[#052e16] font-bold text-sm mb-10 transition-colors focus:outline-none group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        All Blogs
      </button>

      {/* Header Info */}
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#052e16] leading-[1.15] mb-6">
          {post.title}
        </h1>

        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400 justify-center md:justify-start items-center">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            {formatDate(post.date)}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            {post.readTime}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            {post.author}
          </span>
        </div>
      </header>

      {/* Featured Image */}
      <div className="w-full aspect-[16/9] rounded-[2.5rem] overflow-hidden mb-12 shadow-md">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content Body */}
      <div className="prose max-w-none text-slate-600 font-medium text-base md:text-lg leading-relaxed mb-20 space-y-6">
        {post.content.map((paragraph, index) => (
          <p key={index} className="text-justify">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Footer Banner CTA */}
      <div className="bg-[#eef9f2] border border-[#c2f575]/30 rounded-[2.5rem] p-8 md:p-12 text-center mb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c2f575]/10 rounded-full blur-2xl" />
        <h3 className="text-2xl font-black text-[#052e16] mb-3 relative z-10">
          Ready to scale your tuition centre?
        </h3>
        <p className="text-slate-500 font-medium text-sm max-w-lg mx-auto mb-8 relative z-10">
          Reclaim your time from WhatsApp groups and registry books. Build custom zones for materials, attendance, and analytics.
        </p>
        <button
          onClick={() => navigate('/auth?mode=signup')}
          className="bg-[#c2f575] hover:bg-[#aee85e] text-[#052e16] px-8 py-3 rounded-full font-bold text-sm transition-all shadow-md relative z-10 focus:outline-none"
        >
          Get Started for Free
        </button>
      </div>

      {/* Read Next Section */}
      <div className="border-t border-slate-100 pt-16">
        <h3 className="text-2xl font-extrabold text-slate-800 mb-8">Related Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {relatedPosts.map((rPost) => (
            <div
              key={rPost.id}
              onClick={() => navigate(`/blog/${rPost.id}`)}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-4">
                <img
                  src={rPost.image}
                  alt={rPost.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm mb-2 group-hover:text-[#052e16] transition-colors line-clamp-2 min-h-[40px]">
                {rPost.title}
              </h4>
              <span className="text-[11px] font-bold text-slate-400">{formatDate(rPost.date)}</span>
            </div>
          ))}
        </div>
      </div>

    </article>
  );
};

export default BlogDetail;
