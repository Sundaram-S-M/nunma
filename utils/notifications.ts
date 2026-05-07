
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const sendEnrollmentEmail = async ({ studentEmail, studentName, zoneName, tutorName, zoneId }: {
  studentEmail: string;
  studentName?: string;
  zoneName: string;
  tutorName: string;
  zoneId: string;
}) => {
  if (!functions) {
    console.warn("Firebase Functions not initialized. Email will not be sent.");
    return;
  }

  try {
    const sendEmail = httpsCallable(functions, 'sendEnrollmentEmail');
    await sendEmail({ studentEmail, studentName, zoneName, tutorName, zoneId });
  } catch (err) {
    console.error('Enrollment email failed:', err);
  }
};
