import React from 'react';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of Verifiable Education',
    excerpt: 'How Zero-Knowledge Proofs and W3C credentials are fundamentally changing how we prove our skills.',
    category: 'Engineering',
    date: 'Mar 15, 2026',
    readTime: '5 min read',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 2,
    title: 'Monetizing Your Knowledge Base with AI',
    excerpt: 'Leveraging AI co-hosts and dynamic PPP pricing to scale your educational business globally.',
    category: 'Growth',
    date: 'Mar 12, 2026',
    readTime: '4 min read',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 3,
    title: 'Building High-Performance Learning Zones',
    excerpt: 'The technical architecture behind our DRM-protected, ultra-fast video streaming infrastructure.',
    category: 'Product',
    date: 'Mar 10, 2026',
    readTime: '7 min read',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
  }
];

const BlogSection: React.FC = () => {
  return (
    <section id="blog" className="py-24 bg-white border-t border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-slate-50 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black text-brand-slate mb-6">
              Insights from the <span className="text-brand-blue">Frontier.</span>
            </h2>
            <p className="text-xl text-slate-600">
              Thoughts on product, engineering, and the future of verifiable education from the Nunma team.
            </p>
          </div>
          <button className="group inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-brand-slate rounded-full font-semibold hover:bg-slate-200 transition-colors shrink-0">
            <span>View All Posts</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article 
              key={post.id}
              className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-xs font-bold text-brand-blue tracking-wide uppercase">
                    {post.category}
                  </span>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{post.readTime}</span>
                  </div>
                  <span>•</span>
                  <span>{post.date}</span>
                </div>
                
                <h3 className="text-xl font-bold text-brand-slate mb-3 group-hover:text-brand-blue transition-colors line-clamp-2">
                  {post.title}
                </h3>
                
                <p className="text-slate-600 line-clamp-3 mb-6 flex-1">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center text-brand-blue font-semibold text-sm mt-auto group-hover:text-blue-700">
                  <span className="mr-2">Read Article</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
