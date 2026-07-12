import React from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const LandingPricing: React.FC = () => {
  const navigate = useNavigate();

  const toSignup = () => navigate('/auth?mode=signup');
  const toPricing = () => navigate('/settings/pricing');

  return (
    <section id="pricing" className="bg-[#fcfcfc] pt-12 pb-24">
      <div className="max-w-6xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
            <span>✨</span> Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-[#000000] tracking-tight">
            Flexible Plans for Every Type of Educator
          </h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto mb-10">
            Whether you're an individual teacher or a growing institution, choose a plan that fits
            your goals and scale confidently as you grow.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto"
        >

          {/* Starter */}
          <motion.div
            variants={itemVariants}
            className="bg-[#eef9f2]/50 text-[#000000] px-8 py-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center"
          >
            <h3 className="text-xl font-extrabold text-[#000000] mb-2">Starter Plan</h3>
            <p className="text-xs text-gray-500 font-medium mb-6 min-h-[40px]">
              Perfect for solo teachers looking to organize and deliver lessons with ease.
            </p>
            <div className="text-5xl font-extrabold text-[#052e16] mb-2">
              ₹0<span className="text-lg text-gray-500 font-medium">/mo</span>
            </div>
            <button
              onClick={toSignup}
              className="w-full bg-white border border-gray-200 text-[#000000] py-3 rounded-full font-bold hover:bg-gray-50 transition-colors my-8 text-sm"
            >
              Start Free Trial →
            </button>
            <ul className="space-y-4 mb-4 text-sm font-medium text-left">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <span className="text-gray-600">10% Platform Fee</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                Manage up to 100 students
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                10 Streams/mo (150 hrs)
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                3 GB Storage
              </li>
              <li className="flex items-center text-gray-400">
                <X className="w-5 h-5 text-red-300 mr-3 shrink-0" />
                No Add-ons
              </li>
            </ul>
          </motion.div>

          {/* Standard — highlighted */}
          <motion.div
            variants={itemVariants}
            className="bg-[#052e16] text-[#fcfcfc] px-8 py-12 rounded-[2.5rem] shadow-2xl relative z-10 text-center scale-105 border border-[#144225]"
          >
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-[#c2f575] text-[#1a3a05] text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-md">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Standard Plan</h3>
            <p className="text-xs text-gray-300 font-medium mb-6 min-h-[40px]">
              Tailored for emerging educators needing custom integration and performance.
            </p>
            <div className="text-5xl font-extrabold text-white mb-2">
              ₹1,499<span className="text-lg text-gray-400 font-medium">/mo</span>
            </div>
            <button
              onClick={toPricing}
              className="w-full bg-white text-[#052e16] py-3 rounded-full font-bold hover:bg-gray-100 transition-colors my-8 text-sm"
            >
              Upgrade to Standard
            </button>
            <ul className="space-y-4 mb-4 text-sm font-medium text-left">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-white mr-3 shrink-0" />
                <span className="text-gray-200">5% Platform Fee</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-[#c2f575] mr-3 shrink-0" />
                Manage up to 250 students
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-[#c2f575] mr-3 shrink-0" />
                25 Streams/mo (375 hrs)
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-[#c2f575] mr-3 shrink-0" />
                15 GB Storage
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-[#c2f575] mr-3 shrink-0" />
                Add-ons Available
              </li>
            </ul>
          </motion.div>

          {/* Premium */}
          <motion.div
            variants={itemVariants}
            className="bg-[#eef9f2]/50 text-[#000000] px-8 py-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center"
          >
            <h3 className="text-xl font-extrabold text-[#000000] mb-2">Premium Plan</h3>
            <p className="text-xs text-gray-500 font-medium mb-6 min-h-[40px]">
              Built for schools and organizations that need automation and deep insights.
            </p>
            <div className="text-5xl font-extrabold text-[#052e16] mb-2">
              ₹4,999<span className="text-lg text-gray-500 font-medium">/mo</span>
            </div>
            <button
              onClick={toPricing}
              className="w-full bg-white border border-[#c2f575] text-[#052e16] py-3 rounded-full font-bold hover:bg-[#c2f575]/10 transition-colors my-8 text-sm"
            >
              Upgrade to Premium →
            </button>
            <ul className="space-y-4 mb-4 text-sm font-medium text-left">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <span className="text-gray-600">2% Platform Fee</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                Unlimited students
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                60 Streams/mo (900 hrs)
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                30 GB Storage
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                Priority Support
              </li>
            </ul>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default LandingPricing;
