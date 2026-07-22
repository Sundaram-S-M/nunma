import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import { 
  Rocket, 
  Video, 
  Sparkles, 
  LineChart, 
  Award, 
  CreditCard,
  ArrowRight
} from 'lucide-react';

const ProFeatures: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: <Video className="w-8 h-8 text-[#c2f575]" />,
      title: 'Ultra-Low Latency Live Classroom',
      description: 'Stop juggling Zoom links and unverified WhatsApp messages. Nunma’s native WebRTC engine provides crystal-clear audio/video, seamless screen sharing, and interactive whiteboards natively in your browser.',
      benefit: 'Real-time interaction with zero 3rd-party dependencies. Keeps your students inside your ecosystem.',
      scenario: 'Conducting a highly interactive 100-student doubt-clearing session where you switch instantly between your webcam and an interactive whiteboard, without ever leaving the platform.'
    },
    {
      icon: <Sparkles className="w-8 h-8 text-[#c2f575]" />,
      title: 'AI Assignment Builder',
      description: 'The AI-powered engine automatically parses your teaching material to generate quizzes, multiple-choice questions, and subjective assignments in seconds.',
      benefit: 'Saves you 10+ hours a week on manual assignment creation and grading.',
      scenario: 'You just finished teaching a complex chapter. Instead of spending the weekend typing out a test, you upload your syllabus PDF and the AI instantly generates a 50-question mock test with accurate answer keys.'
    },
    {
      icon: <LineChart className="w-8 h-8 text-[#c2f575]" />,
      title: 'Results History & Deep Analytics',
      description: 'Centralized dashboard tracking every student’s performance, attendance, and engagement. Identify weak points automatically and generate professional reports.',
      benefit: 'Data-driven teaching that proves your impact to parents and students.',
      scenario: 'It’s parent-teacher meeting time. With one click, you download a bulk date-range report showing exactly where a student improved and where they need focus, colored beautifully with green/yellow status badges.'
    },
    {
      icon: <Award className="w-8 h-8 text-[#c2f575]" />,
      title: 'Automated Certificate Issuance',
      description: 'Issue cryptographic, verifiable digital certificates to your students upon course completion. Let them showcase your brand on their professional profiles.',
      benefit: 'Builds a verifiable legacy for you while boosting student morale and portfolio credibility.',
      scenario: 'A student completes your 3-month bootcamp. They automatically receive a branded, verified certificate which they add directly to their LinkedIn profile, driving organic referrals to your next batch.'
    },
    {
      icon: <CreditCard className="w-8 h-8 text-[#c2f575]" />,
      title: 'Integrated Payment Hub',
      description: 'Stop chasing fees manually. Fully automated billing, invoicing, and access control tied directly to student payments.',
      benefit: 'Zero revenue leakage and completely automated administration.',
      scenario: 'A new student wants to join your masterclass. They pay via UPI or card directly on your zone page. Upon successful payment, the system instantly unlocks their digital materials and emails them the live session links—while you sleep.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-[#c2f575] selection:text-[#052e16] flex flex-col">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[#052e16] rounded-b-[3rem] shadow-2xl">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#c2f575]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#aee85e]/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Rocket className="w-4 h-4 text-[#c2f575]" />
            Thala Pro Features
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
            Scale Your <span className="text-[#c2f575]">Teaching Empire</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Everything you need to automate your operations, deliver world-class learning experiences, and multiply your revenue—all in one powerful dashboard.
          </p>
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            <button
              onClick={() => navigate('/auth?mode=signup&role=THALA&redirect=/workplace/launch')}
              className="bg-[#c2f575] text-[#052e16] hover:bg-[#aee85e] px-10 py-4 rounded-full font-extrabold text-lg transition-all shadow-[0_0_40px_rgba(194,245,117,0.4)] hover:shadow-[0_0_60px_rgba(194,245,117,0.6)] hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-24 px-6 flex-grow">
        <div className="max-w-5xl mx-auto space-y-12">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_12px_60px_rgba(0,0,0,0.08)] transition-shadow duration-300"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="bg-[#052e16] p-5 rounded-3xl shrink-0 shadow-inner">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">{feature.title}</h3>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">The Benefit</h4>
                      <p className="text-gray-800 font-medium">{feature.benefit}</p>
                    </div>
                    <div className="bg-[#f0fdf4] rounded-2xl p-6 border border-[#c2f575]/30">
                      <h4 className="text-sm font-bold text-[#052e16] uppercase tracking-wider mb-2">Real-world Scenario</h4>
                      <p className="text-[#052e16]/80 font-medium leading-relaxed">{feature.scenario}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 tracking-tight">Ready to upgrade your teaching?</h2>
          <button
            onClick={() => navigate('/auth?mode=signup&role=THALA&redirect=/workplace/launch')}
            className="bg-[#052e16] text-white hover:bg-[#0a4724] px-10 py-4 rounded-full font-extrabold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 mx-auto block"
          >
            Create Your Zone Now
          </button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default ProFeatures;
