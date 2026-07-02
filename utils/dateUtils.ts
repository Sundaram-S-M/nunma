export const formatDate = (dateValue: any): string => {
    if (!dateValue || dateValue === 'Present') return dateValue;
    
    let date: Date;
    if (typeof dateValue === 'object' && dateValue.toDate) {
        // Handle Firestore Timestamp
        date = dateValue.toDate();
    } else if (typeof dateValue === 'object' && dateValue.seconds) {
        // Handle serialized timestamp
        date = new Date(dateValue.seconds * 1000);
    } else {
        date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) return dateValue;
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    
    return `${dd} ${mm} ${yyyy}`;
};
