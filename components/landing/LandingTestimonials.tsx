import React from 'react';
import { ArrowLeft, ArrowRight, MapPin, Quote, Star } from 'lucide-react';

const LandingTestimonials: React.FC = () => {
  return (
    <section id="testimonials" className="bg-[#fcfcfc] py-24">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
          <span>✨</span> Testimonials
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-center text-[#000000] mb-6 tracking-tight">
          What Our Users Say About Us
        </h2>
        <p className="text-gray-500 font-medium max-w-2xl mx-auto mb-16 text-center leading-relaxed">
          Build trust and social proof using real voices — teachers, students, and institutions
          sharing their positive experiences with our platform.
        </p>

        <div className="w-full bg-gradient-to-br from-[#eef9f2] to-[#f4fbf6] rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
          {/* Decorative quote icon */}
          <div className="absolute top-12 right-12 opacity-10">
            <Quote className="w-24 h-24 text-[#052e16]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">

            {/* Left column */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-extrabold text-[#000000] mb-6 tracking-tight leading-snug">
                  "Trusted by Educators and Learners Worldwide"
                </h3>
                <p className="text-gray-600 font-medium text-sm leading-relaxed mb-10">
                  See how our platform transforms classrooms, empowers teachers, and helps students
                  reach their full potential — from small tutoring groups to large institutions.
                </p>
                <div className="flex gap-4 mb-12">
                  <button className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white transition-colors text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#052e16] flex items-center justify-center hover:bg-[#052e16]/90 transition-colors text-white">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-4">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
                  alt="Educator"
                  className="w-20 h-24 object-cover rounded-2xl shadow-sm filter grayscale hover:grayscale-0 transition-all cursor-pointer"
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop"
                  alt="Educator"
                  className="w-20 h-24 object-cover rounded-2xl shadow-sm filter grayscale hover:grayscale-0 transition-all cursor-pointer"
                />
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
                  alt="Educator"
                  className="w-20 h-24 object-cover rounded-2xl shadow-sm filter grayscale hover:grayscale-0 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Center — featured image */}
            <div className="lg:col-span-4 flex justify-center">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop"
                alt="Featured educator"
                className="w-full max-w-[280px] h-full min-h-[350px] object-cover rounded-3xl shadow-xl border-4 border-white"
              />
            </div>

            {/* Right — quote */}
            <div className="lg:col-span-4 flex flex-col justify-center pt-8 lg:pt-0">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                  alt="Courtney Henry"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <div className="font-extrabold text-[#000000]">Courtney Henry</div>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xl md:text-2xl font-bold text-[#1a1a4e] leading-snug mb-10">
                "This platform made our entire teaching process seamless. Assignments, grading, and
                communication — everything happens in one place. Our students love the interactive
                design!"
              </p>

              <div className="flex items-center gap-2 text-gray-500 font-medium text-sm mt-auto border-t border-gray-200/60 pt-6">
                <MapPin className="w-4 h-4" />
                Chennai, Tamil Nadu
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingTestimonials;
