import { Resend } from 'resend';

export async function sendCredentialsEmail({ to, name, username, password, m3uUrl, portalUrl }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00b832;">Your IPTV Subscription is Ready 🎉</h2>
      <p>Hello ${name || ''},</p>
      <p>Your account has been activated. Here are your login details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Username:</td>
          <td style="padding: 8px;">${username}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Password:</td>
          <td style="padding: 8px;">${password}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">M3U URL:</td>
          <td style="padding: 8px; word-break: break-all;">${m3uUrl}</td>
        </tr>
      </table>
      <p>You can also log in to your client dashboard anytime to see your current connection details:</p>
      <p><a href="${portalUrl}" style="background: #00b832; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
      <p style="color: #888; font-size: 12px; margin-top: 30px;">If the connection details ever change, your dashboard will always show the latest version — no need to wait for another email.</p>
    </div>
  `;

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: 'Your IPTV Account Details',
    html,
  });
}
