export const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    if (dateValue === 'Present') return 'Present';
    
    // Handle string inputs directly to avoid timezone offset issues with YYYY-MM-DD
    if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        if (!trimmed) return '';
        // Match YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [y, m, d] = trimmed.split('-');
            return `${d}-${m}-${y}`;
        }
        // Match DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
            return trimmed;
        }
        // Match YYYY-MM-DD with time e.g. 2026-07-30T17:46 or 2026-07-30 17:46
        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
        if (isoMatch) {
            const [, y, m, d] = isoMatch;
            return `${d}-${m}-${y}`;
        }
    }

    let date: Date;
    if (dateValue instanceof Date) {
        date = dateValue;
    } else if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
        // Handle Firestore Timestamp
        date = dateValue.toDate();
    } else if (typeof dateValue === 'object' && dateValue.seconds !== undefined) {
        // Handle serialized timestamp
        date = new Date(dateValue.seconds * 1000);
    } else {
        date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) return typeof dateValue === 'string' ? dateValue : '';
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    
    return `${dd}-${mm}-${yyyy}`;
};

