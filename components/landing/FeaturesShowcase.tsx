import React from 'react';
import { Layers, BrainCircuit, ShieldAlert, Globe2, Fingerprint } from 'lucide-react';

const features = [
  {
    icon: <Layers className="w-8 h-8 text-brand-blue" />,
    title: 'Adaptive Learning Zones',
    description: 'Your Digital Campus. Self-contained, premium learning environments. Secure video streaming with Bunny Stream integration prevents unauthorized hotlinking.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: <BrainCircuit className="w-8 h-8 text-brand-blue" />,
    title: 'AI-Driven Intelligence',
    description: 'Powered by Gemini. Upload a document to generate MCQs in seconds. In your LiveRoom, a Gemini co-host answers real-time questions and analyzes sentiment.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: <ShieldAlert className="w-8 h-8 text-rose-600" />,
    title: 'Premium Assessment & Proctoring',
    description: 'Our digital engine tracks tab-switching. A strict 3-strike policy auto-terminates cheating. Grade PDF scripts interactively or bulk-import via Excel.',
    color: 'bg-rose-50 border-rose-100',
  },
  {
    icon: <Globe2 className="w-8 h-8 text-emerald-600" />,
    title: 'Global Monetization',
    description: 'Direct INR-based pricing model. Razorpay split-payment architecture autonomously calculates commissions and handles tax.',
    color: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: <Fingerprint className="w-8 h-8 text-amber-600" />,
    title: 'Cryptographic Proof-of-Work',
    description: 'W3C Verifiable Credentials built on OpenBadges 3.0. Zero-Knowledge Proofs let students securely share achievements without exposing private data.',
    color: 'bg-amber-50 border-amber-100',
  }
];

const FeaturesShowcase: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-brand-slate mb-6">
            The infrastructure to <span className="text-brand-blue">scale.</span>
          </h2>
          <p className="text-xl text-slate-600">
            Everything you need to deliver high-performance proof-of-work locked behind enterprise-grade security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className={`p-8 rounded-3xl border ${feature.color} hover:border-brand-blue/30 transition-all duration-300 group bg-white`}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
          {/* Fill empty grid spot on lg screens */}
          <div className="hidden lg:block p-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 flex flex-col justify-center items-center text-center opacity-70">
            <h3 className="text-lg font-semibold text-slate-500 mb-2">More coming soon</h3>
            <p className="text-sm text-slate-400">Our engineering team ships daily.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;
