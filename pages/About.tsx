import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Sparkles, 
  Target, 
  HeartHandshake, 
  Globe, 
  Briefcase, 
  Scale, 
  Award, 
  Zap, 
  CheckCircle2, 
  Rocket,
  Check,
  X
} from 'lucide-react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';

const About: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sustainableGoals = [
    {
      icon: Globe,
      badge: "Goal 1",
      title: "Quality education for everyone, everywhere",
      description: "A tutor in a small town should have access to the same quality of teaching tools as one in a metro city. Geography should never limit the quality of education a student receives.",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      iconColor: "text-emerald-700"
    },
    {
      icon: Briefcase,
      badge: "Goal 2",
      title: "Decent work for tutors",
      description: "Teaching is real, skilled work. Nunma exists to help tutors build sustainable, respected livelihoods from their expertise, not just gig-style income.",
      badgeColor: "bg-lime-100 text-lime-800 border-lime-200",
      iconColor: "text-lime-700"
    },
    {
      icon: Scale,
      badge: "Goal 3",
      title: "Reduced inequality in access",
      description: "By keeping Nunma affordable and built for local teaching businesses first, we're working to make sure world-class teaching infrastructure isn't reserved for those who can already afford it.",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      iconColor: "text-teal-700"
    },
    {
      icon: Award,
      badge: "Goal 4",
      title: "Verified, trustworthy credentials for life",
      description: "Every certificate issued through Nunma is built to last and be verified for a lifetime, so a student's proof of learning is never lost, faked, or forgotten.",
      badgeColor: "bg-green-100 text-green-800 border-green-200",
      iconColor: "text-green-700"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] antialiased font-sans selection:bg-[#c2f575] selection:text-[#052e16]">
      
      {/* Top Navbar */}
      <LandingNavbar />

      {/* Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2 flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-[#052e16] hover:border-slate-300 font-semibold text-sm transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#052e16]" />
          <span>Back to Home</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#052e16] text-xs font-bold tracking-wider uppercase shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tirunelveli, Tamil Nadu</span>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="pt-8 pb-16 px-6 max-w-5xl mx-auto text-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-[#052e16] text-xs md:text-sm font-extrabold tracking-wide mb-6">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>ABOUT NUNMA</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#052e16] mb-6 leading-tight">
          Vanakkam. <span className="text-emerald-600">I'm Sundaram.</span>
        </h1>

        {/* Featured Founder Statement Box - Deep Forest Dark Background for Maximum Contrast */}
        <div className="max-w-4xl mx-auto my-8 p-8 md:p-12 rounded-3xl bg-[#052e16] text-white shadow-2xl relative overflow-hidden text-left border border-emerald-700/50">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <p className="text-2xl md:text-3xl font-extrabold text-[#c2f575] leading-snug tracking-tight mb-6">
            "I started Nunma from Tirunelveli — and that's not a small detail, it's the point."
          </p>

          <div className="w-20 h-1 bg-[#c2f575] rounded-full mb-6" />

          <p className="text-base md:text-lg text-emerald-100 leading-relaxed font-normal">
            For too long, the story has been the same: the best tools, the best platforms, the biggest opportunities — they all seem to belong to the big cities. I wanted to prove that something world-class could be built right here, from Tirunelveli, for the tutors and teaching businesses who've never had technology built for them.
          </p>
        </div>
      </section>

      {/* THE PROBLEM I SAW */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-[#052e16] mb-3">
            The problem I saw
          </h2>
          <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto font-medium">
            Every tutor I met was fighting the same invisible war — not with their students, but with their tools.
          </p>
        </div>

        {/* Scattered tools vs Nunma comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8">
          
          {/* Old Way Card */}
          <div className="p-8 rounded-3xl bg-white border border-red-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-6">
                <span>THE FRAGMENTED PAST</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Managing 5 Disconnected Tools</h3>
              
              <ul className="space-y-3.5 text-slate-700 font-medium">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100 text-slate-800">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>A WhatsApp group for announcements</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100 text-slate-800">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>Another WhatsApp group for doubts</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100 text-slate-800">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>A paper register for attendance</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100 text-slate-800">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>A notebook for tracking fees</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100 text-slate-800">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>A separate app to try and go live</span>
                </li>
              </ul>
            </div>
            
            <p className="mt-8 text-sm text-red-700 font-semibold border-t border-red-100 pt-4">
              None of it talking to each other. All of it stealing time that should have gone into teaching.
            </p>
          </div>

          {/* Nunma Solution Card */}
          <div className="p-8 rounded-3xl bg-[#052e16] text-white shadow-xl flex flex-col justify-between border border-emerald-600/40">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c2f575] text-[#052e16] text-xs font-black mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#052e16]" />
                <span>THE NUNMA SOLUTION</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">One Unified Teaching Platform</h3>
              
              <ul className="space-y-3.5 text-emerald-100 font-medium">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50">
                  <Check className="w-5 h-5 text-[#c2f575] shrink-0 mt-0.5" />
                  <span>Integrated live classroom & interactive whiteboard</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50">
                  <Check className="w-5 h-5 text-[#c2f575] shrink-0 mt-0.5" />
                  <span>Automated attendance & fee tracking ledger</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50">
                  <Check className="w-5 h-5 text-[#c2f575] shrink-0 mt-0.5" />
                  <span>Instant student doubt resolution & zone chat</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50">
                  <Check className="w-5 h-5 text-[#c2f575] shrink-0 mt-0.5" />
                  <span>Cryptographic lifetime verifiable credentials</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-600/50 text-emerald-200 text-sm leading-relaxed">
              <strong className="text-[#c2f575]">Teaching deserves better than this.</strong> A tutor's energy should go into their students — not into managing five disconnected tools just to hold a class together. <em className="text-white font-bold block mt-1">That's why Nunma exists.</em>
            </div>
          </div>

        </div>
      </section>

      {/* WHAT WE'RE BUILDING (VISION & MISSION) */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-[#052e16] text-xs font-extrabold tracking-wider uppercase mb-3">
            <Target className="w-4 h-4 text-emerald-700" />
            <span>OUR PURPOSE</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#052e16]">What we're building</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vision */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#052e16] flex items-center justify-center mb-6">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-[#052e16] mb-4">Our Vision</h3>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg">
              A future where teaching is treated as the serious, respected profession it is — where a tutor in Tirunelveli has access to the same caliber of platform as any large institution in the country. We want a world where Nunma isn't just software tutors use, but the ecosystem education runs on — the same way a school needs a campus, a modern tutor needs Nunma.
            </p>
          </div>

          {/* Mission */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#052e16] flex items-center justify-center mb-6">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-[#052e16] mb-4">Our Mission</h3>
            <p className="text-slate-700 leading-relaxed text-base md:text-lg">
              To give every tutor, coaching institute, and teaching business one platform to teach, manage, and grow — replacing the scattered registers, WhatsApp groups, and disconnected apps with a single system built around how teaching actually works.
            </p>
          </div>

        </div>
      </section>

      {/* SUSTAINABLE GROWTH (4 COMMITMENTS) */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-[#052e16] text-xs font-extrabold tracking-wider uppercase mb-3">
            <HeartHandshake className="w-4 h-4 text-emerald-700" />
            <span>SUSTAINABILITY & IMPACT</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#052e16] mb-4">
            Our commitment to sustainable growth
          </h2>
          <p className="text-slate-700 text-base md:text-lg leading-relaxed font-medium">
            Building Nunma from Tirunelveli means our mission has always been about more than just software — it's about closing the gap between big cities and towns like ours. We hold ourselves to goals that go beyond the platform:
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {sustainableGoals.map((goal, idx) => {
            const Icon = goal.icon;
            return (
              <div 
                key={idx}
                className="p-8 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-200 ${goal.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${goal.badgeColor}`}>
                    {goal.badge}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-[#052e16] mb-3">
                  {goal.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed text-sm md:text-base font-normal">
                  {goal.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center p-5 rounded-2xl bg-emerald-50 border border-emerald-200 max-w-xl mx-auto">
          <p className="text-[#052e16] font-bold text-sm md:text-base italic">
            "These aren't side commitments — they're the reason Nunma exists in the first place."
          </p>
        </div>
      </section>

      {/* WHAT WE STAND FOR */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="p-8 md:p-12 rounded-3xl bg-[#052e16] text-white shadow-2xl relative overflow-hidden text-center border border-emerald-700/50">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#c2f575] mb-6">
            What we stand for
          </h2>

          <div className="space-y-6 text-emerald-100 text-base md:text-lg font-normal leading-relaxed max-w-3xl mx-auto">
            <p>
              We're not trying to be another option in a crowded market. Nunma isn't competing — <strong className="text-white font-bold underline decoration-[#c2f575] underline-offset-4">we're setting the standard.</strong> A standard where every tutor has the tools to deliver their best work, and every student gets proof of what they've truly earned.
            </p>
            <p>
              We believe in tutors. We believe the person who spends their evenings preparing tomorrow's class deserves a platform that respects that effort — one that makes them more effective, not more burdened.
            </p>
          </div>
        </div>
      </section>

      {/* WHERE WE ARE TODAY & FOUNDING TUTORS CTA */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="p-8 md:p-12 rounded-3xl bg-white border-2 border-emerald-500/30 text-center shadow-lg">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-[#052e16] text-xs font-extrabold tracking-wider uppercase mb-6">
            <Zap className="w-4 h-4 text-emerald-700" />
            <span>PRE-LAUNCH ERA</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-[#052e16] mb-6">
            Where we are today
          </h2>

          <p className="text-slate-700 text-base md:text-lg leading-relaxed max-w-3xl mx-auto mb-6">
            We're early. Nunma is pre-launch, and we're building this with the first tutors who choose to build alongside us — not for them, but with them. Every founding tutor who joins us right now isn't just an early user. They're helping shape what this becomes.
          </p>

          <p className="text-[#052e16] text-base md:text-lg font-bold leading-relaxed max-w-3xl mx-auto mb-8">
            If you're a tutor who's tired of holding your teaching business together with WhatsApp groups and paper registers — this is for you. And if you believe, like I do, that something great can come out of Tirunelveli and go on to change how an entire country teaches — welcome. Let's build it together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="w-full sm:w-auto bg-[#c2f575] text-[#052e16] hover:bg-[#aee85e] px-8 py-4 rounded-full font-extrabold text-base transition-all shadow-md active:scale-95"
            >
              Become a Founding Tutor
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 px-8 py-4 rounded-full font-bold text-base transition-all"
            >
              Explore Platform
            </button>
          </div>
        </div>
      </section>

      {/* FOUNDER SIGNOFF */}
      <section className="pb-16 px-6 max-w-md mx-auto text-center">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#052e16] text-[#c2f575] font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            S
          </div>
          <div className="text-2xl font-extrabold text-[#052e16] mb-1">
            Sundaram S M
          </div>
          <div className="text-emerald-700 font-bold text-sm tracking-wider uppercase mb-2">
            Founder & CEO, Nunma
          </div>
          <div className="text-slate-500 text-xs font-semibold flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tirunelveli, Tamil Nadu</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <LandingFooter />

    </div>
  );
};

export default About;
