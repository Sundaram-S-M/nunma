import React from 'react';
import { MonitorPlay, CreditCard, Globe, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  {
    icon: <MonitorPlay className="w-6 h-6 text-[#052e16]" />,
    title: 'Unified Classroom',
    desc: 'Run high-performance live streams without leaving your teaching zone.',
  },
  {
    icon: <CreditCard className="w-6 h-6 text-[#052e16]" />,
    title: 'Fee Automation',
    desc: 'Stop chasing payment screenshots. Razorpay escrow handles it all.',
  },
  {
    icon: <Globe className="w-6 h-6 text-[#052e16]" />,
    title: 'Discovery Market',
    desc: 'Showcase your expertise on a global public storefront.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#052e16]" />,
    title: 'Proof-of-Work',
    desc: 'Issue cryptographically-verified credentials and build undeniable credibility.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const LandingFeatures: React.FC = () => {
  return (
    <section id="features" className="bg-[#fcfcfc] text-[#000000] py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 relative z-10">

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-b from-[#eef9f2] to-transparent rounded-[3rem] p-12 text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
            <span>✨</span> Why Choose Us
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-[#000000] tracking-tight">
            Why Thousands of <br /> Educators Trust{' '}
            <span className="text-[#052e16]">"Nunma"</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-gray-600 leading-relaxed font-medium">
            Built to empower schools, creators, and learners — with performance, simplicity, and
            innovation at its core.
          </p>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-20 px-8"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="p-8 rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col items-center text-center"
            >
              <div className="bg-[#eef9f2] w-14 h-14 rounded-full flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-lg font-extrabold mb-3 text-[#000000]">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LandingFeatures;
