import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How much does it cost to start my teaching academy?',
    a: "Zero! You can launch your Free Zone with absolutely no initial investment. It gives you all the essential tools to start teaching and building your community instantly. When you're ready for advanced analytics and automation, you can seamlessly upgrade to a Pro Zone.",
  },
  {
    q: 'Can I move my students from WhatsApp easily?',
    a: 'Yes! Generate a single invite link. Students click, pay, and are instantly enrolled into your private Nunma zone.',
  },
  {
    q: 'Do my students need to download an app to join?',
    a: 'They have total flexibility! For the ultimate native mobile experience, students can download the official Nunma app directly from the Google Play Store. Alternatively, they can instantly join live classes, submit assignments, and access notes from any mobile or desktop browser by simply logging in at nunma.in.',
  },
  {
    q: 'Is the Nunma app available for both tutors and students?',
    a: 'Yes! Both Thalas (educators) and Manas (students) can seamlessly jump between the Android app and the web platform. Whether you are managing your Zone from your desktop or checking on your community on the go via the mobile app, your entire ecosystem stays perfectly in sync.',
  },
  {
    q: 'Will Nunma help me with assessments and grading?',
    a: 'Yes! ⚡ Our platform leverages advanced AI tools. You can generate structured quizzes in seconds from any document, and our system assists with automated grading and evaluation, saving you hours of administrative work.',
  },
  {
    q: 'Can I use Nunma if I run a larger coaching center or institution?',
    a: 'Absolutely. We offer customized institutional dashboards designed for colleges, skill institutes, and coaching centers. You can manage multiple faculties (Thalas), monitor batch performance, and track attendance all under your own branded ecosystem.',
  },
  {
    q: 'How secure are my payouts?',
    a: 'We use bank-grade Razorpay escrow routing. Funds are split automatically and deposited directly into your linked bank account.',
  },
  {
    q: 'Are there any hidden streaming fees?',
    a: 'None. Your monthly stream allowances cover all bandwidth costs for your live classes.',
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-3xl bg-white shadow-sm overflow-hidden transition-all duration-200">
      <button
        className="w-full px-8 py-5 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-extrabold text-[#000000] text-base md:text-lg pr-4">{question}</span>
        <div
          className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform shrink-0 ${
            open ? 'rotate-180 bg-[#c2f575]/20 text-[#052e16]' : 'text-gray-400'
          }`}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>
      <div
        className={`px-8 text-gray-600 text-sm font-medium leading-relaxed transition-all duration-300 ease-in-out overflow-hidden ${
          open ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {answer}
      </div>
    </div>
  );
};

const LandingFAQ: React.FC = () => {
  return (
    <section id="faq" className="bg-[#fcfcfc] py-24">
      <div className="max-w-3xl mx-auto px-6 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-600 mb-6 shadow-sm">
          <span>✨</span> FAQ
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-[#000000] mb-12 tracking-tight">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4 w-full">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
