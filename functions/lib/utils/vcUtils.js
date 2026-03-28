"use strict";
/**
 * Verifiable Credential & OpenBadges 3.0 Utilities for Backend
 * Implements W3C VC standards for professional certifications.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenBadgePayload = void 0;
const generateOpenBadgePayload = (studentName, courseName, issueDate, certId, platformUrl) => {
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
exports.generateOpenBadgePayload = generateOpenBadgePayload;
//# sourceMappingURL=vcUtils.js.map