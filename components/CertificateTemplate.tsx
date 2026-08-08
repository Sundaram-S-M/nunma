import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface CertificateTemplateProps {
    studentName: string;
    courseName: string;
    tutorName: string;
    tutorPosition?: string;
    issueDate: string;
    logoUrl?: string; // Optional custom logo
    signatureUrl?: string;
    qrDataUrl?: string;
    brandColorPrimary?: string;
    brandColorSecondary?: string;
    certificateId?: string; // Add the UUID prop
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
    studentName,
    courseName,
    tutorName,
    tutorPosition = "Course Instructor",
    issueDate,
    logoUrl,
    signatureUrl,
    qrDataUrl = "https://nunma.in/verify/sample",
    brandColorPrimary = '#052E16', // Default Dark Green
    brandColorSecondary = '#bbf7d0', // Default Light Green
    certificateId = "XXXX-XXXX-XXXX-XXXX" // Default UUID
}) => {
    return (
        <div id="certificate-preview-node" className="relative w-full aspect-[1.414/1] bg-white overflow-hidden" style={{ containerType: 'inline-size', border: `1.5cqi solid ${brandColorPrimary}` }}>
            
            {/* Inner Decorative Border */}
            <div className="absolute pointer-events-none" style={{ top: '1.5cqi', bottom: '1.5cqi', left: '1.5cqi', right: '1.5cqi', border: `0.2cqi solid ${brandColorPrimary}`, opacity: 0.4 }} />
            
            {/* Main Content Container */}
            <div className="absolute inset-0 flex" style={{ padding: '6cqi' }}>
                
                {/* Left Side (Text Content) */}
                <div className="w-2/3 h-full flex flex-col justify-between z-10">
                    
                    {/* Header */}
                    <div style={{ marginTop: '2cqi' }}>
                        <h1 className="font-black uppercase tracking-tight leading-none" style={{ color: '#111827', fontSize: '5cqi' }}>
                            Certificate Of<br />Completion
                        </h1>
                    </div>

                    {/* Middle Section (Student Details) */}
                    <div style={{ marginTop: '-4cqi' }}>
                        <p className="font-medium" style={{ color: '#4b5563', fontSize: '1.5cqi', marginBottom: '1cqi' }}>This is to certify that</p>
                        
                        <div>
                            <h2 className="font-serif italic tracking-wide" style={{ color: '#111827', fontSize: '4.5cqi' }}>
                                {studentName || "[ STUDENT FULLNAME ]"}
                            </h2>
                            <div style={{ width: '80%', height: '0.15cqi', backgroundColor: brandColorPrimary, marginTop: '0.5cqi', marginBottom: '2cqi' }} />
                        </div>

                        <div>
                            <p className="font-medium" style={{ color: '#4b5563', fontSize: '1.5cqi', marginBottom: '0.5cqi' }}>has successfully completed the course</p>
                            <p className="font-bold" style={{ color: '#111827', fontSize: '2cqi' }}>
                                "{courseName || "[ COURSE / ZONE TITLE ]"}"
                            </p>
                        </div>
                    </div>

                    {/* Bottom Left (Signature) */}
                    <div style={{ marginBottom: '1cqi' }}>
                        <div className="flex items-end justify-start" style={{ width: '25cqi', height: '6cqi', marginBottom: '0.5cqi' }}>
                            {signatureUrl ? (
                                <img src={signatureUrl} alt="Signature" className="max-h-full object-contain" />
                            ) : (
                                <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-300 italic" style={{ fontSize: '1cqi' }}>
                                    Signature Area
                                </div>
                            )}
                        </div>
                        <div style={{ width: '25cqi', height: '0.2cqi', backgroundColor: brandColorPrimary, opacity: 0.5, marginBottom: '0.5cqi' }} />
                        <h3 className="font-bold" style={{ color: '#111827', fontSize: '1.8cqi' }}>{tutorName || "[Tutor Name]"}</h3>
                        <p style={{ color: '#6b7280', fontSize: '1.2cqi' }}>{tutorPosition}</p>
                    </div>
                </div>

                {/* Right Side (Ribbon & Badge) */}
                <div className="w-1/3 h-full relative">
                    
                    {/* Vertical Ribbon */}
                    <div className="absolute shadow-lg z-0" style={{ backgroundColor: brandColorPrimary, top: '-6cqi', bottom: '6cqi', right: '4cqi', width: '12cqi' }}>
                        {/* Ribbon tail triangle effect */}
                        <div className="absolute bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 50%, 0 100%)', bottom: '-6cqi', left: 0, right: 0, height: '6cqi' }}></div>
                    </div>

                    {/* Badge */}
                    <div className="absolute rounded-full flex items-center justify-center shadow-xl z-10" 
                         style={{ 
                             top: '50%', right: '0cqi', transform: 'translateY(-50%)',
                             width: '20cqi', height: '20cqi',
                             backgroundColor: brandColorSecondary,
                             border: `0.4cqi dashed ${brandColorPrimary}`,
                         }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="Institution Logo" className="object-contain rounded-full" style={{ width: '12cqi', height: '12cqi' }} />
                        ) : (
                            <div className="bg-white rounded-full flex items-center justify-center shadow-inner" style={{ width: '12cqi', height: '12cqi' }}>
                                <span className="font-black text-center uppercase tracking-widest text-gray-300" style={{ fontSize: '1.5cqi' }}>Your<br/>Logo</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Right (Date & QR) */}
                    <div className="absolute flex items-end text-right z-10" style={{ bottom: '2cqi', right: '18cqi', gap: '2cqi' }}>
                        <div style={{ marginBottom: '0.5cqi' }}>
                            <p style={{ color: '#6b7280', fontSize: '1.2cqi' }}>Issued on :</p>
                            <p className="font-bold" style={{ color: '#111827', fontSize: '1.5cqi' }}>{issueDate || "[ DATE ]"}</p>
                            <p style={{ color: '#9ca3af', fontSize: '0.8cqi', marginTop: '0.5cqi' }}>ID: {certificateId}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100" style={{ padding: '0.8cqi' }}>
                            <QRCodeSVG value={qrDataUrl} style={{ width: '6cqi', height: '6cqi' }} fgColor={brandColorPrimary} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CertificateTemplate;
