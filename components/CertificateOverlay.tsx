
import React from 'react';

interface CertificateOverlayProps {
    template: string;
    studentName: string;
    zoneName: string;
    signature1?: string | null;
    signature2?: string | null;
    brandColor?: string;
}

const CertificateOverlay: React.FC<CertificateOverlayProps> = ({
    template,
    studentName,
    zoneName,
    signature1,
    signature2,
    brandColor = '#1A1A4E'
}) => {
    return (
        <div className="relative w-full aspect-[1.414/1] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 group">
            {/* Base Template Image */}
            <img src={template} className="w-full h-full object-cover" alt="Certificate Template" width="500" height="500" />

            {/* Dynamic Overlays */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none">

                {/* Student Name Placeholder Logic */}
                <div className="mt-[10%] w-full">
                    <h2
                        className="text-4xl md:text-6xl font-black italic tracking-tighter mb-2"
                        style={{ color: brandColor }}
                    >
                        {studentName || "{Name of the student}"}
                    </h2>
                    <div className="w-[40%] h-[2px] mx-auto opacity-20" style={{ backgroundColor: brandColor }} />
                </div>

                {/* Zone Name Placeholder Logic */}
                <div className="mt-8">
                    <p className="text-gray-500 font-medium text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                        By continuing to learn, they have expanded their perspective, sharpened their skills, and made themselves even more in demand. Additionally, they are now certified, having completed the
                        <span className="font-bold ml-1" style={{ color: brandColor }}>{zoneName || "{Zone Name}"}</span>.
                    </p>
                </div>

                {/* Signatures Logic */}
                <div className="absolute bottom-[15%] left-0 right-0 flex justify-around px-20">
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-32 mb-2 flex items-center justify-center">
                            {signature1 && <img src={signature1} className="max-h-full max-w-full object-contain" alt="Sig 1" width="500" height="500" />}
                        </div>
                        <div className="w-32 h-[1px] bg-gray-300 mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Signature</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="h-16 w-32 mb-2 flex items-center justify-center">
                            {signature2 && <img src={signature2} className="max-h-full max-w-full object-contain" alt="Sig 2" width="500" height="500" />}
                        </div>
                        <div className="w-32 h-[1px] bg-gray-300 mb-1" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secondary Signature</p>
                    </div>
                </div>
            </div>

            {/* Hover Instruction Overlay */}
            <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Dynamic Preview Active</p>
            </div>
        </div>
    );
};

export default CertificateOverlay;
