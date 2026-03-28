/**
 * Verifiable Credential & OpenBadges 3.0 Utilities for Backend
 * Implements W3C VC standards for professional certifications.
 */

export interface OpenBadgeVC {
    "@context": string;
    type: string[];
    issuer: {
        id: string;
        type: string;
        name: string;
    };
    credentialSubject: {
        type: string;
        name?: string;
        achievement: {
            name: string;
        };
    };
    issuanceDate?: string;
    id?: string;
}

export const generateOpenBadgePayload = (
    studentName: string,
    courseName: string,
    issueDate: string,
    certId: string,
    platformUrl: string
): OpenBadgeVC => {
    return {
        "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.2.json",
        "type": ["VerifiableCredential", "OpenBadgeCredential"],
        "issuer": {
            "id": platformUrl,
            "type": "Profile",
            "name": "Nunma EdTech"
        },
        "credentialSubject": {
            "type": "AchievementSubject",
            "name": studentName,
            "achievement": {
                "name": courseName
            }
        },
        "id": certId,
        "issuanceDate": issueDate
    };
};
