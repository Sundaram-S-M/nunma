import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  PhoneCall, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';

type PolicyTab = 'terms' | 'privacy' | 'refund' | 'shipping' | 'contact';

const LegalPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<PolicyTab>(() => {
    if (section && ['terms', 'privacy', 'refund', 'shipping', 'contact'].includes(section)) {
      return section as PolicyTab;
    }
    return 'terms';
  });

  useEffect(() => {
    if (section && ['terms', 'privacy', 'refund', 'shipping', 'contact'].includes(section)) {
      setActiveTab(section as PolicyTab);
    }
  }, [section]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleTabChange = (tab: PolicyTab) => {
    setActiveTab(tab);
    navigate(`/legal/${tab}`);
  };

  const policySections: { id: PolicyTab; title: string; subtitle: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'terms',
      title: 'Terms of Service / Terms & Conditions',
      subtitle: 'Platform rules, user responsibilities, and legal agreements.',
      icon: FileText
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'How we collect, protect, and handle your data.',
      icon: ShieldCheck
    },
    {
      id: 'refund',
      title: 'Refund & Cancellation Policy',
      subtitle: 'Subscription cancellations, refund eligibility, and timelines.',
      icon: RotateCcw
    },
    {
      id: 'shipping',
      title: 'Shipping / Service Delivery Policy',
      subtitle: 'Instant digital delivery and SaaS fulfillment details.',
      icon: Truck
    },
    {
      id: 'contact',
      title: 'Contact Us / Grievance Redressal',
      subtitle: 'Reach support, registered address, and Grievance Officer.',
      icon: PhoneCall
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] antialiased font-sans selection:bg-[#c2f575] selection:text-[#052e16]">
      
      {/* Top Navbar */}
      <LandingNavbar />

      {/* Top Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2 flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-[#052e16] hover:border-slate-300 font-semibold text-sm transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#052e16]" />
          <span>Back to Home</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#052e16] text-xs font-bold tracking-wider uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Nunma Legal Hub</span>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="pt-8 pb-10 px-6 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#052e16] mb-4">
          Legal & Policies
        </h1>
        <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto font-medium">
          Clear, transparent, and trustworthy guidelines governing the Nunma platform and educational ecosystem.
        </p>
      </section>

      {/* 5 POLICY NAVIGATION CARDS (Hub Grid) */}
      <section className="px-6 max-w-5xl mx-auto mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {policySections.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`p-5 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between border ${
                  isActive
                    ? 'bg-[#052e16] text-white border-[#052e16] shadow-lg scale-[1.02]'
                    : 'bg-white text-slate-800 border-slate-200/90 hover:border-emerald-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-[#c2f575] text-[#052e16]' : 'bg-emerald-50 text-[#052e16] border border-emerald-100'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#c2f575]' : 'text-slate-400'}`} />
                  </div>
                  <h3 className={`font-bold text-base mb-1 ${isActive ? 'text-white' : 'text-[#052e16]'}`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {item.subtitle}
                  </p>
                </div>

                {isActive && (
                  <div className="mt-4 pt-2 border-t border-emerald-700/50 flex items-center gap-1.5 text-xs font-bold text-[#c2f575]">
                    <span>Currently Reading</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* DETAILED CONTENT DISPLAY CONTAINER */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
          
          {/* Active Header Banner */}
          <div className="p-8 md:p-10 bg-[#052e16] text-white border-b border-emerald-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c2f575] text-[#052e16] text-xs font-black mb-3">
                <span>OFFICIAL POLICY DOCUMENT</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                {policySections.find(p => p.id === activeTab)?.title}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Last updated &amp; effective: July 2026 · Compliant with Indian IT Act &amp; RBI Payment Rules
              </p>
            </div>
            
            <div className="shrink-0 text-slate-300 text-xs font-mono bg-emerald-950/80 px-4 py-2 rounded-xl border border-emerald-700/50">
              Doc ID: NUNMA-POL-{activeTab.toUpperCase()}-2026
            </div>
          </div>

          {/* POLICY BODY CONTENT */}
          <div className="p-8 md:p-12 prose prose-slate max-w-none text-slate-700 leading-relaxed text-base space-y-8">
            
            {/* 1. TERMS OF SERVICE */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                
                {/* Preamble */}
                <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-slate-800 space-y-4">
                  <p className="font-medium leading-relaxed">
                    Welcome to Nunma. The Owner (<strong>Nunma Private Limited, Tirunelveli, Tamil Nadu</strong>) provides access to the Website/Platform, subject to the Terms and Conditions stated hereinbelow. This document is an electronic record as per the Information Technology Act, and the same being generated by a computer, does not require any physical or digital signature; hence, your access to and/or use of this Website/Platform automatically signifies your consent to be bound by these Terms and Conditions. It is thus insisted that you carefully peruse and understand the same before accessing and/or using the Website/Platform for any purpose whatsoever.
                  </p>
                  <p className="text-sm text-slate-600 italic border-t border-emerald-200/60 pt-3">
                    It is apprised to you that the Owner may, at its sole discretion, alter, modify, amend or remove the Terms and Conditions without giving any notice to you; therefore, kindly apprise yourself with all such changes to ensure due compliance with the same.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 1. Access and Use */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">1. Website/Platform Access and Use</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>1.1.</strong> The Owner grants you a non-exclusive and revocable license to access and/or use the Website/Platform as per the Terms and Conditions, and such grant of license does not create any right, interest, or privilege in your favour.</p>
                    <p><strong>1.2.</strong> This license prohibits you from copying, duplicating, downloading, selling, reverse engineering or misusing the Website/Platform and/or its contents for any purpose that may be or become illegal in the eyes of law.</p>
                    <p><strong>1.3.</strong> The Owner may, at its sole discretion and without giving any notice to you, restrict, suspend or terminate access and/or usage of this Website/Platform or any of its contents.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. Content */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">2. Website/Platform Content</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>2.1.</strong> The Content of this Website/Platform shall include but not limited to its Name, Domain, Software, Logo, Source Code, Internet Protocol, Web Space, Layout, Design, Copyright, Patent, Trademark, images, texts, videos, graphics, audios, buttons icons, information, contact details of the Owner, and such other material posted/uploaded/created by the Owner.</p>
                    <p><strong>2.2.</strong> Such Content of the Website/Platform is and shall remain the exclusive Intellectual Property of the Owner, and any access and/or use of the same shall not create, transfer or imply any right over such Intellectual Property in your favour.</p>
                    <p><strong>2.3.</strong> The Owner does not claim any right, privilege or interest over the content posted/uploaded/created on this Website/Platform by any other person and/or entity.</p>
                    <p><strong>2.4.</strong> The Owner may alter, modify, add or delete the Content of this Website/Platform without providing any notice or intimation to you, and it shall be your responsibility to apprise yourself of such changes.</p>
                    <p><strong>2.5.</strong> The Owner shall endeavour not to publish or upload any incorrect, inaccurate or insensitive content on the Website/Platform.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 3. Disclaimer of Liability */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">3. Disclaimer of Liability</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>3.1.</strong> The Owner shall not be liable for any loss or damage caused due to access or usage of the Website/Platform, including but not limited to its interruption, cessation, hacking, overloading, server malfunction, bugs or virus attack, power failure, unauthorised access and/or such other cause which is or may be beyond the Owner’s control.</p>
                    <p><strong>3.2.</strong> The Owner shall not be liable for any loss or damage caused by incorrect, inaccurate or insensitive content published on the Website/Platform owing to human error and error of belief, opinion or judgment or owing to any other reason that is beyond the Owner’s control.</p>
                    <p><strong>3.3.</strong> This Website/Platform may provide access to links offered by a third party, which may lead to their own destination Website/Platforms, and the Owner shall not be liable to any person and/or entity for any loss or damage caused due to access or usage of such links or of such destination Website/Platforms or of their contents.</p>
                    <p><strong>3.4.</strong> The Owner shall not be liable for any loss or damage caused to your hardware, internet connection, software, and/or any other instrument/gadget/equipment used by you to access this Website/Platform.</p>
                    <p><strong>3.5.</strong> The Owner shall not be liable for any loss or damage caused to any person and/or entity owing to your acts or omissions and/or owing to the acts or omissions of any person and/or entity representing the Owner.</p>
                    <p><strong>3.6.</strong> The Owner shall not be liable for any loss or damage caused by any communication made to you through any contact number/email id other than the ones mentioned on this Website/Platform.</p>
                    <p><strong>3.7.</strong> You shall solely be liable for any loss or damage caused to any person and/or entity owing to your acts or omissions during, out of the course of, or in consequence of access or use of the Website/Platform; and/or in violation of the Terms and Conditions.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 4. Indemnification */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">4. Indemnification</h3>
                  <p className="text-slate-700">
                    You shall indemnify, defend and hold harmless the Owner for any loss or damage caused to any person and/or entity as a consequence of your acts or omissions.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 5. Grievance Redressal */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">5. Grievance Redressal and Customer Support</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>5.1.</strong> All grievances with respect to Terms and Conditions of this Website/Platform shall be addressed by <strong>Mr Sundaram S M (Grievance Officer)</strong>, and you are requested to write to him, regarding the grievance through mail, at <a href="mailto:support@nunma.in" className="text-emerald-800 font-bold hover:underline">support@nunma.in</a>.</p>
                    <p><strong>5.2.</strong> The Grievance Officer shall endeavour to get back to you within 5 working days of receipt of your communication, and the redressal/closure of your issue shall be done at the earliest.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 6. Dispute Resolution */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">6. Dispute Resolution</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>6.1.</strong> Any dispute, claim, or controversy arising out of or relating to these Terms and Conditions or your use of the Nunma platform shall first be subject to good-faith negotiation. The disputing party must provide prompt written notice to the other party detailing the grievance. The parties shall attempt to amicably resolve the issue within thirty (30) days of receiving such notice.</p>
                    <p><strong>6.2.</strong> If the dispute is not resolved within the thirty (30) day period, either party may initiate binding arbitration. The arbitration shall be governed by the Arbitration and Conciliation Act, 1996. The dispute shall be referred to a sole arbitrator mutually appointed by both parties. If the parties fail to agree on a sole arbitrator within thirty (30) days of the arbitration notice, the appointment shall be made by the competent court having jurisdiction.</p>
                    <p><strong>6.3.</strong> The seat and venue of arbitration shall be <strong>Tirunelveli, Tamil Nadu, India</strong>. All arbitration proceedings, including written submissions and oral hearings, shall be conducted exclusively in the English language.</p>
                    <p><strong>6.4.</strong> Arbitration in Tirunelveli is the mandatory and exclusive method of dispute resolution for all users residing within the Republic of India. However, if you reside outside of India and are subject to mandatory international consumer protection laws that legally prohibit forced arbitration in a foreign jurisdiction, this arbitration mandate does not apply to you. In such instances, you retain the right to seek legal remedies in your local competent courts.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 7. Governing Law */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">7. Governing Law</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>7.1.</strong> These Terms and Conditions, and any disputes arising out of or related to them, shall be governed by and construed in accordance with the laws of the Republic of India. However, if you reside outside of India, your use of the platform and our services will also be governed by the mandatory consumer protection laws of your local jurisdiction, which shall supersede Indian law strictly concerning your statutory consumer rights.</p>
                    <p><strong>7.2.</strong> Subject to the mandatory arbitration provisions outlined above, any legal suit, action, or court proceeding arising out of or relating to these Terms and Conditions shall be instituted exclusively in the competent courts located in <strong>Tirunelveli, Tamil Nadu, India</strong>. However, if you reside outside of India and are protected by mandatory international consumer protection laws, this exclusive jurisdiction provision does not restrict your statutory rights. In such instances, you retain the legal right to bring proceedings regarding your consumer rights before the competent courts in your local jurisdiction of residence.</p>
                  </div>
                </div>

              </div>
            )}

            {/* 2. PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                
                {/* Preamble */}
                <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-slate-800 space-y-4">
                  <p className="font-medium leading-relaxed">
                    The Owner (<strong>Nunma Private Limited, Tirunelveli, Tamilnadu</strong>) may receive and collect Data as described under clause 1, during and/or out of the course of access or use of this Website/Platform which is created by the Developer (Nunma Private Limited, Tirunelveli, Tamilnadu) or of the Products, and the same shall be governed by this Privacy Policy. This document is an electronic record as per the Information Technology Act, and the same being generated by a computer, does not require any physical or digital signature; hence, your access or use of this Website/Platform, use of the Products, or entering any Data on the Website/Platform automatically signifies your consent to be bound by this Privacy Policy. The Owner values the trust you place in it, and it insists that you carefully peruse and understand the same before accessing and/or using the Website/Platform or Products and before entering the Data on the Website/Platform for any purpose whatsoever.
                  </p>
                  <p className="text-sm text-slate-600 italic border-t border-emerald-200/60 pt-3">
                    It is apprised to you that the Owner may, at its sole discretion, alter, modify, amend, or remove the terms of this Privacy Policy without giving notice to you; therefore, kindly apprise yourself with all such changes to ensure due compliance with the same.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 1. What type of data do we receive/collect? */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">1. What type of data do we receive/collect?</h3>
                  <p className="text-slate-700 mb-3">
                    From our Customers, we only collect Customer Information that is necessary to establish and maintain the provision of the Service to them, as well as to understand and improve the usage and performance of the Service. When our Customers are corporations, as opposed to individuals, this information is not “Personal Information”.
                  </p>
                  <div className="space-y-2 text-slate-700 pl-2">
                    <p><strong>1.1.</strong> Personal information such as your name, contact number, residential address, email address, etc.</p>
                    <p><strong>1.2.</strong> Professional information such as your company details, GST Number, etc.</p>
                    <p><strong>1.3.</strong> Purchase information such as your billing address and details (as necessary for our internal accounting purposes and for processing payments through our contracted processing service).</p>
                    <p><strong>1.4.</strong> Communications with the Owner on WhatsApp, Customer Support Chatbox, Email, telephone, etc.</p>
                    <p><strong>1.5.</strong> Browsing information such as your Internet Protocol Address, Internet Service Provider, Web Browser, Operating System, Geolocation, etc.</p>
                    <p><strong>1.6.</strong> Automated information such as your clickstream patterns and paths, heatmaps, etc.</p>
                    <p><strong>1.7.</strong> Statistical information such as your use and preferences with the Website/Platform offered by the Owner, etc.</p>
                    <p><strong>1.8.</strong> Other content such as the reviews posted on the Website/Platform, etc.</p>
                    <p><strong>1.9.</strong> Any other information received as a consequence of your access or use of the Website/Platform or use of the Products.</p>
                    <p><strong>1.10.</strong> Login information for provisioned users, such as usernames and encrypted passwords.</p>
                    <p><strong>1.11.</strong> Information about how the Customer and its provisioned users use the Service, including information about the Customer, location information, usage patterns, and intended use of the Service.</p>
                    <p><strong>1.12.</strong> Information provided by the Customer and its provisioned users in connection with any support given by the Owner's team related to the Service.</p>
                    <p><strong>1.13.</strong> Login information for third-party integrations to Owner's Platform/Website, such as usernames and encrypted passwords.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. What type of data do you receive? */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">2. What type of data do you receive?</h3>
                  <p className="text-slate-700">
                    All payments for sessions or courses booked on the Owner's Platform/Website platform are processed securely through our authorized third-party payment partners. Students will not receive, nor have direct access to, the personal financial information or bank account details of the Tutors. By confirming a booking, the Student authorizes the platform to charge their selected payment method for the total amount due.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 3. Why do we receive/collect data? */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">3. Why do we receive/collect data?</h3>
                  <p className="text-slate-700">
                    The Owner collects your data to provide efficient services to you; to comply with its legal obligation; to improve its Website/Platform provided by the Owner; to ensure your valid identification and authentication; to maintain your record; to conduct internal research on your demographics, interests, and behaviour; to administer the Website/Platform; and to communicate with you for understanding your queries and for providing requisite information regarding the same to you.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 4. Where do we store the data? */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">4. Where do we store the data?</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>4.1.</strong> To ensure high performance and security, Owner utilizes industry-leading, third-party cloud service providers (such as Google Firebase) to host and store Customer Information. We do not maintain physical data servers on our premises. You acknowledge and agree that your data will be stored and processed within the secure cloud infrastructure provided by these carefully vetted sub-processors.</p>
                    <p><strong>4.2.</strong> To keep Owner's Platform/Website running smoothly and securely, we automatically collect some technical data when you use our platform:</p>
                    <div className="pl-4 space-y-2">
                      <p><strong>4.2.1. Server Logs:</strong> Our secure cloud servers automatically record basic details about how you interact with Owner's Platform/Website, such as your IP address, what kind of device you are using, and error reports if the app crashes.</p>
                      <p><strong>4.2.2. Cookies:</strong> We place small data files called "cookies" on your device. These help us recognize you so you don’t have to log in every time you open a new page, and they help us understand how you navigate the platform. You can disable cookies in your browser settings, though some parts of Owner's Platform/Website might not work properly if you do.</p>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 5. Data Protection */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">5. Data Protection</h3>
                  <p className="text-slate-700 mb-3">
                    Because Owner operates as a global platform connecting tutors and students, we have engineered our security practices to meet worldwide standards. We are committed to protecting your personal information through strict technical, organizational, and legal safeguards.
                  </p>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>5.1.</strong> We process and protect your data in compliance with the world’s leading privacy frameworks, ensuring your rights are respected regardless of where you reside. This includes:</p>
                    <div className="pl-4 space-y-1">
                      <p><strong>5.1.1. GDPR (General Data Protection Regulation):</strong> Protecting users in the European Union and the United Kingdom.</p>
                      <p><strong>5.1.2. CCPA/CPRA (California Consumer Privacy Act):</strong> Safeguarding the privacy rights of residents in California, USA.</p>
                      <p><strong>5.1.3. DPDP Act (Digital Personal Data Protection Act):</strong> Governing the processing of digital personal data for our users in India.</p>
                    </div>
                    <p><strong>5.2.</strong> Our methods of protection include:</p>
                    <div className="pl-4 space-y-1">
                      <p><strong>5.2.1. Physical Measures:</strong> We enforce restricted physical access to Owner’s corporate offices and company-issued hardware. For the physical servers hosting our platform, we rely on the enterprise-grade, heavily restricted physical security protocols maintained by our carefully vetted third-party cloud infrastructure providers.</p>
                      <p><strong>5.2.2. Organizational Measures:</strong> Including employee training and limiting access on a “need-to-know” basis; and</p>
                      <p><strong>5.2.3. Technological Measures:</strong> Including the use of passwords and encryption.</p>
                    </div>
                    <p><strong>5.3.</strong> Owner implements industry-standard measures to protect your personal data against theft, unauthorized modification, and accidental loss.</p>
                    <p><strong>5.4.</strong> If Owner has reason to believe that a security breach compromising your personal data has occurred, we will immediately initiate our incident response procedures. We will notify you and the appropriate regulatory authorities without undue delay and no later than seventy-two (72) hours after discovery. This formal notification will clearly explain the nature of the breach, the specific information involved, and the potential consequences to you. Concurrently, Owner will take all necessary technical and operational steps to contain the threat, secure the platform, and mitigate any resulting damages.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 6. Data Sharing */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">6. Data Sharing</h3>
                  <p className="text-slate-700">
                    Owner may disclose your personal data to global law enforcement, regulatory agencies, or courts when strictly required by applicable laws, including the GDPR, CCPA, or DPDP Act. We will only share the minimum necessary information required to fulfill these legal obligations and protect our platform; with any third party if such disclosure of data is necessary to provide services to you and to fulfill the Terms and Conditions, Terms of Use and Return and Refund Policy; with its Lawyers, Accountants, and such other such professional bodies; and with any other person and/or entity as may be necessary under the law as well as for fulfilment of the services provided by the Owner to you.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 7. Data Retention */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">7. Data Retention</h3>
                  <p className="text-slate-700">
                    The Owner shall retain your data with itself during and until you continue to avail its Services, or longer if required for facilitating, record-keeping, accounting, investigating, troubleshooting problems, resolving disputes, and/or legal purposes, as may be deemed fit by the Owner.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 8. Data Confidentiality */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">8. Data Confidentiality</h3>
                  <div className="space-y-2 text-slate-700">
                    <p><strong>8.1.</strong> The Owner shall maintain confidentiality of the data received and collected from you (which you inform to be confidential in nature) with the same degree of care as it would deploy to protect its own Confidential Information.</p>
                    <p><strong>8.2.</strong> You are also required to maintain the confidentiality of the financial information received by you from the Owner.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 9. Warranty */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">9. Warranty</h3>
                  <p className="text-slate-700">
                    You warrant that the data uploaded, posted, and entered by you on the Website/Platform is legal, accurate, authentic, and correct.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 10. Disclaimer of Liability */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">10. Disclaimer of Liability</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>10.1.</strong> The Owner does not claim any ownership of your data or the data of any third parties posted, uploaded, or entered on the Website/Platform.</p>
                    <p><strong>10.2.</strong> The Owner shall not be liable for any loss or damage caused owing to the legality, accuracy, authenticity, and correctness of the data posted, uploaded, or entered on the Website/Platform by you.</p>
                    <p><strong>10.3.</strong> The Owner shall not be liable for any loss of your data owing to sharing of the same with any third party, and although the same may be consequential to services of the Owner, such data shall be governed by the respective Privacy Policies of such third parties.</p>
                    <p><strong>10.4.</strong> The Owner shall not be liable for any loss of your data owing to your unauthorised access or use of the Website/Platform of the Owner.</p>
                    <p><strong>10.5.</strong> The Owner shall not be liable for any loss of your data or any consequential loss or damage caused due to reasons beyond its control, including but not limited to maintenance, power failure, server malfunction, content loss, misuse or abuse, unwarranted access gained by hackers, viruses, or like infiltrators, force majeure, negligence of the Developer, etc.</p>
                    <p><strong>10.6.</strong> The Owner shall not be liable for loss of your data or any consequential loss caused as a consequence of any act or omission at the behest of any person or entity representing the Owner without due authorization from the Owner.</p>
                    <p><strong>10.7.</strong> You shall solely be liable for any loss or damage caused to the data belonging to you or to any third party or to the Owner, or for any consequential loss or damage caused to any person and/or entity, owing to the acts or omissions on your part.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 11. Indemnification */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">11. Indemnification</h3>
                  <p className="text-slate-700">
                    You shall indemnify, defend, and hold harmless the Owner for any loss or damage caused to any person and/or entity as a consequence of your acts or omissions.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* 12. Grievance Redressal and Customer Support */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">12. Grievance Redressal and Customer Support</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>12.1.</strong> All grievances with respect to privacy and protection of data shall be addressed by <strong>Mr. Sundaram S M (Grievance Officer)</strong>, and you are requested to write to him regarding the grievance through mail, at <a href="mailto:support@nunma.in" className="text-emerald-800 font-bold hover:underline">support@nunma.in</a>.</p>
                    <p><strong>12.2.</strong> The Grievance Officer shall endeavour to get back to you within 5 working days of receipt of your communication, and the redressal/closure of your issue shall be done at the earliest.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 13. Dispute Resolution */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">13. Dispute Resolution</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>13.1.</strong> Any dispute, claim, or controversy arising out of or relating to this Privacy Policy shall first be subject to good-faith negotiation. The disputing party must provide prompt written notice to the other party detailing the grievance. The parties shall attempt to amicably resolve the issue within thirty (30) days of receiving such notice.</p>
                    <p><strong>13.2.</strong> If the dispute is not resolved within the thirty (30) day period, either party may initiate binding arbitration. The arbitration shall be governed by the Arbitration and Conciliation Act, 1996. The dispute shall be referred to a sole arbitrator mutually appointed by both parties. If the parties fail to agree on a sole arbitrator within thirty (30) days of the arbitration notice, the appointment shall be made by the competent court having jurisdiction.</p>
                    <p><strong>13.3.</strong> The seat and venue of arbitration shall be <strong>Tirunelveli, Tamil Nadu, India</strong>. All arbitration proceedings, including written submissions and oral hearings, shall be conducted exclusively in the English language.</p>
                    <p><strong>13.4.</strong> Arbitration in Tirunelveli is the mandatory and exclusive method of dispute resolution for all users residing within the Republic of India. However, if you reside outside of India and are subject to mandatory international privacy laws (such as the GDPR or CCPA) that legally prohibit forced arbitration in a foreign jurisdiction, this arbitration mandate does not apply to you. In such instances, you retain the right to lodge a complaint or seek legal remedies in your local competent courts or regulatory data protection authorities.</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 14. Governing Law */}
                <div>
                  <h3 className="text-xl font-extrabold text-[#052e16] mb-3">14. Governing Law</h3>
                  <div className="space-y-3 text-slate-700">
                    <p><strong>14.1.</strong> This Privacy Policy, and any disputes arising out of or related to it, shall be governed by and construed in accordance with the laws of the Republic of India. However, if you reside outside of India, the processing of your personal data will also be governed by the mandatory data protection laws of your local jurisdiction (such as the GDPR or CCPA), which shall supersede Indian law strictly concerning your statutory privacy rights.</p>
                    <p><strong>14.2.</strong> Subject to the mandatory arbitration provisions outlined above, any legal suit, action, or court proceeding arising out of or relating to this Privacy Policy shall be instituted exclusively in the competent courts located in <strong>Tirunelveli, Tamil Nadu, India</strong>. However, if you reside outside of India and are protected by mandatory international data protection laws (including but not limited to the GDPR or CCPA), this exclusive jurisdiction provision does not restrict your statutory rights. In such instances, you retain the legal right to bring proceedings regarding your privacy rights before the competent courts or data protection authorities in your local jurisdiction of residence.</p>
                  </div>
                </div>

              </div>
            )}

            {/* 3. REFUND & CANCELLATION POLICY */}
            {activeTab === 'refund' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#052e16] mb-3">1. Subscription Cancellations</h3>
                  <p>
                    Tutors and students may cancel recurring monthly or annual platform subscriptions at any time via <strong>Settings &gt; Billing &amp; Subscriptions</strong>. Upon cancellation, your access will remain active until the end of the current paid billing cycle, after which no further charges will occur.
                  </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">2. Zone Membership &amp; Course Refunds</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>7-Day Standard Guarantee:</strong> Enrolled students may request a 100% refund for recorded digital courses within <strong>7 days of purchase</strong>, provided less than 20% of the content has been viewed.</li>
                    <li><strong>Live Sessions &amp; Masterclasses:</strong> Refund requests for live interactive sessions must be submitted at least 24 hours before the scheduled start time.</li>
                  </ul>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">3. Unfulfilled Sessions &amp; Technical Outages</h3>
                  <p>
                    If a live class or service is cancelled by the tutor or cannot be completed due to major platform technical failures, enrolled students will receive a <strong>100% full refund or session credit</strong> automatically.
                  </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">4. Refund Processing Timeline</h3>
                  <p>
                    Once approved, refunds are credited back to the original payment method (Credit/Debit Card, Netbanking, UPI, or Razorpay wallet) within <strong>5 to 7 business days</strong> as per banking and gateway processing rules.
                  </p>
                </div>
              </div>
            )}

            {/* 4. SHIPPING / SERVICE DELIVERY POLICY */}
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#052e16] mb-3">1. Instant Digital Service Delivery</h3>
                  <p>
                    Nunma operates as a Software-as-a-Service (SaaS) and online learning platform. All purchases, including zone access, live classroom enrollment, digital study materials, and certificates, are delivered <strong>instantly and digitally upon successful payment confirmation</strong>.
                  </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">2. Confirmation &amp; Access Details</h3>
                  <p>
                    Upon successful transaction completion, an automated email receipt containing access credentials, zone invitation links, and payment invoice will be dispatched immediately to your registered email address. Access is also instantly enabled in your Nunma User Dashboard.
                  </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">3. Physical Material Fulfillment (If Applicable)</h3>
                  <p>
                    In rare cases where a tutor offers physical course materials or printed workbooks, items will be dispatched via registered Indian courier partners within <strong>3 to 5 business days</strong> of order placement. Tracking details will be shared via email and SMS.
                  </p>
                </div>
              </div>
            )}

            {/* 5. CONTACT US / GRIEVANCE REDRESSAL */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#052e16] mb-3">1. Official Contact &amp; Business Entity</h3>
                  <p>
                    For general support, billing inquiries, platform guidance, or grievance redressal, please reach out to us through any of the official channels below:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                  
                  {/* Entity Box */}
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <h4 className="font-extrabold text-[#052e16] text-lg mb-3">Registered Business Address</h4>
                    <p className="text-sm font-semibold text-slate-800 mb-1">Nunma Private Limited</p>
                    <p className="text-sm text-slate-600 mb-1">Founder &amp; CEO: Sundaram S M</p>
                    <p className="text-sm text-slate-600 flex items-start gap-1.5 mt-2">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Tirunelveli, Tamil Nadu - 627001, India</span>
                    </p>
                  </div>

                  {/* Direct Channels */}
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <h4 className="font-extrabold text-[#052e16] text-lg mb-3">Direct Support Channels</h4>
                    
                    <div className="space-y-3 text-sm">
                      <a 
                        href="mailto:support@nunma.in" 
                        className="flex items-center gap-2 font-semibold text-emerald-800 hover:underline"
                      >
                        <Mail className="w-4 h-4 text-emerald-700" />
                        <span>Customer Support: support@nunma.in</span>
                      </a>

                      <a 
                        href="mailto:grievance@nunma.in" 
                        className="flex items-center gap-2 font-semibold text-emerald-800 hover:underline"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Grievance Desk: grievance@nunma.in</span>
                      </a>

                      <a 
                        href="https://wa.me/919487724185" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 font-bold text-emerald-900 hover:underline"
                      >
                        <PhoneCall className="w-4 h-4 text-emerald-700" />
                        <span>WhatsApp Support: +91 9487724185</span>
                      </a>
                    </div>
                  </div>

                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-xl font-bold text-[#052e16] mb-3">2. Grievance Redressal Officer</h3>
                  <p>
                    In accordance with the Indian Information Technology Act 2000 and rules made thereunder, the name and contact details of the Grievance Officer are provided below:
                  </p>
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                    <p className="font-bold text-slate-900">Officer Name: Sundaram S M</p>
                    <p className="text-slate-600">Designation: Founder &amp; CEO / Grievance Redressal Officer</p>
                    <p className="text-slate-600">Email: grievance@nunma.in</p>
                    <p className="text-slate-600">Response SLA: Acknowledged within 24 hours, resolved within 7 business days.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar inside card */}
          <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-500">
            <div>Have questions about these legal policies? Contact our team.</div>
            <a 
              href="https://wa.me/919487724185" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#052e16] text-white hover:bg-[#084824] transition-colors"
            >
              <span>Contact via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#c2f575]" />
            </a>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <LandingFooter />

    </div>
  );
};

export default LegalPolicy;
