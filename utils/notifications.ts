
export const sendEnrollmentEmail = async ({ studentEmail, studentName, zoneName, tutorName, zoneId }: {
  studentEmail: string;
  studentName?: string;
  zoneName: string;
  tutorName: string;
  zoneId: string;
}) => {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    console.warn("VITE_RESEND_API_KEY is not configured. Email will not be sent.");
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Nunma <support@nunma.in>',
        to: studentEmail,
        subject: "You've been added to a new Zone on Nunma 🎓",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #040457; font-size: 24px;">Welcome to ${zoneName}!</h1>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${studentName || 'Student'},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">You've been added to <strong>"${zoneName}"</strong> by <strong>${tutorName}</strong>.</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Your instructor has granted you full access to this zone. You can start learning immediately.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://nunma.in/zone/${zoneId}" style="background: #c2f575; color: #040457; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Enter Zone →
              </a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Nunma — The Trust Layer for Education</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
    }
  } catch (err) {
    console.error('Enrollment email failed:', err);
  }
};
