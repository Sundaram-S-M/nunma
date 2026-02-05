
/**
 * Verifiable Credential & OpenBadges 3.0 Utilities
 * Implements W3C VC standards for professional certifications.
 */

export interface OpenBadgeVC {
    "@context": string[];
    id: string;
    type: string[];
    issuer: {
        id: string;
        type: string;
        name: string;
        url: string;
    };
    issuanceDate: string;
    credentialSubject: {
        id: string;
        type: string;
        achievement: {
            id: string;
            type: string;
            name: string;
            description: string;
            criteria: {
                narrative: string;
            };
            image?: string;
        };
        grade?: string; // Hidden in selective disclosure
    };
    proof?: {
        type: string;
        created: string;
        proofPurpose: string;
        verificationMethod: string;
        jws: string;
    };
}

export const generateOpenBadgeVC = (studentId: string, studentName: string, zone: any, grade?: number): OpenBadgeVC => {
    const issuanceDate = new Date().toISOString();
    const credentialId = `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;

    return {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.json"
        ],
        id: credentialId,
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
            id: "did:web:nunma.io",
            type: "Profile",
            name: "Nunma Academy",
            url: "https://nunma.io"
        },
        issuanceDate: issuanceDate,
        credentialSubject: {
            id: `did:nunma:student:${studentId.replace(/[^a-zA-Z0-9]/g, '')}`,
            type: "AchievementSubject",
            achievement: {
                id: `https://nunma.io/achievements/${zone.id}`,
                type: "Achievement",
                name: zone.title,
                description: zone.description || "Successful completion of professional learning stream.",
                criteria: {
                    narrative: `Student successfully demonstrated mastery in ${zone.domain} at the ${zone.level} level.`
                },
                image: zone.image
            },
            grade: grade ? `${grade}%` : undefined
        },
        // Mock cryptographic proof for demonstration
        proof: {
            type: "Ed25519Signature2020",
            created: issuanceDate,
            proofPurpose: "assertionMethod",
            verificationMethod: "did:web:nunma.io#key-1",
            jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..mock_signature"
        }
    };
};

export const downloadVCAsJSON = (vc: OpenBadgeVC) => {
    const blob = new Blob([JSON.stringify(vc, null, 2)], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${vc.id.split(':').pop()}.jsonld`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
