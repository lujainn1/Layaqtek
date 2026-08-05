import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"لياقتك" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'إعادة تعيين كلمة المرور - لياقتك',
    html: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #16a34a;">إعادة تعيين كلمة المرور</h2>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في لياقتك.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">
            إعادة تعيين كلمة المرور
          </a>
        </p>
        <p>هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
        <p style="color: #64748b; font-size: 13px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
    `,
  });
}
