import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LegalPolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] antialiased py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 inline-flex items-center gap-2 text-slate-500 hover:text-brand-blue font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-slate-100 bg-brand-slate text-white">
            <h1 className="text-3xl md:text-5xl font-black mb-4">Legal & Policies</h1>
            <p className="text-slate-300 text-lg">
              Everything you need to know about our terms, privacy, and policies.
            </p>
          </div>

          <div className="p-8 md:p-12 space-y-16">
            
            {/* Terms of Service */}
            <section id="terms">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-blue" />
                </div>
                <h2 className="text-2xl font-bold text-brand-slate">Terms of Service</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                <p>
                  Welcome to Nunma. By accessing or using our platform, you agree to be bound by these terms. 
                  Our platform is provided "as is" and we reserve the right to modify these terms at any time.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">1. Account Responsibilities</h3>
                <p>
                  You are responsible for maintaining the security of your account credentials. Any activity 
                  occurring under your account is your responsibility.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">2. Content Ownership</h3>
                <p>
                  Tutors retain all ownership rights to the content they upload. By uploading content, you grant 
                  Nunma a license to distribute and display it to your authorized students.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">3. Payments and Subscriptions</h3>
                <p>
                  All payments are processed securely via our partners. Refunds are subject to our refund policy 
                  and the specific terms set by individual creators within their zones.
                </p>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Privacy Policy */}
            <section id="privacy">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-brand-blue" />
                </div>
                <h2 className="text-2xl font-bold text-brand-slate">Privacy Policy</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                <p>
                  We value your privacy. This policy outlines how we collect, use, and protect your data.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">1. Data Collection</h3>
                <p>
                  We collect information you provide directly, such as your email, name, and profile details. 
                  We also automatically collect standard technical data to ensure platform security and stability.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">2. Data Usage</h3>
                <p>
                  Your data is used exclusively to provide and improve the Nunma platform, process payments, 
                  and issue verifiable credentials. We do not sell your personal data to third parties.
                </p>
                <h3 className="text-lg font-semibold text-brand-slate">3. Video & Proctoring Data</h3>
                <p>
                  For proctored assessments, we track tab-switching and session activity solely for academic 
                  integrity purposes. This session data is encrypted and accessible only to authorized instructors.
                </p>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Security & Compliance */}
            <section id="security">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-brand-blue" />
                </div>
                <h2 className="text-2xl font-bold text-brand-slate">Security & Compliance</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                <p>
                  Nunma's infrastructure is built with enterprise-grade security. Our credentialing system uses 
                  OpenBadges 3.0 and cryptographic proofs to ensure diploma authenticity. All video streams are 
                  secured with DRM and dynamic watermarking to prevent unauthorized distribution.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPolicy;
