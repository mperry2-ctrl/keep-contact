import { Link } from 'react-router-dom'

const s = {
  page: { padding: '2rem', maxWidth: 800, margin: '0 auto', lineHeight: 1.7 },
  back: { display: 'inline-block', marginBottom: '1.5rem', color: '#555', textDecoration: 'none', fontSize: '0.9rem' },
  h1: { marginBottom: '0.25rem' },
  meta: { color: '#666', marginBottom: '2.5rem', fontSize: '0.9rem' },
  h2: { marginTop: '2rem', marginBottom: '0.5rem', fontSize: '1.05rem' },
  h3: { marginTop: '1.25rem', marginBottom: '0.25rem', fontSize: '0.95rem', fontWeight: 600 as const },
  p: { marginBottom: '0.75rem' },
  ul: { paddingLeft: '1.5rem', marginBottom: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '1rem' },
  th: { textAlign: 'left' as const, borderBottom: '2px solid #eee', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#555', fontWeight: 600 as const },
  td: { borderBottom: '1px solid #eee', padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
}

export default function Privacy() {
  return (
    <div style={s.page}>
      <Link to="/login" style={s.back}>← Back to login</Link>

      <h1 style={s.h1}>Privacy Policy</h1>
      <p style={s.meta}>Effective Date: June 2, 2026 &middot; Operator: Michael Perry</p>

      <h2 style={s.h2}>1. Introduction</h2>
      <p style={s.p}>Michael Perry ("we," "us," or "our") operates Keep Contact (the "Service"). This Privacy Policy explains how we collect, use, and protect your information when you use the Service. Keep Contact is intended for users in the United States who are at least 18 years old.</p>

      <h2 style={s.h2}>2. Information We Collect</h2>

      <h3 style={s.h3}>Account information</h3>
      <p style={s.p}>When you create an account, we collect your email address and password. Credentials are processed and stored by Supabase, our authentication provider.</p>

      <h3 style={s.h3}>Contact data you enter</h3>
      <p style={s.p}>The Service allows you to store personal information about your contacts, including: name, nickname, email address, phone number, birthday, job title, company, city, state, country, postal code, tags, notes, and photos.</p>

      <h3 style={s.h3}>Interaction and life event data</h3>
      <p style={s.p}>We store interaction records you log (date, medium, notes) and life events you track (trips, milestones, meetings, birthdays).</p>

      <h3 style={s.h3}>User profile</h3>
      <p style={s.p}>If you create a profile, we store your name, bio, birthday, job title, company, location, phone number, and email.</p>

      <h3 style={s.h3}>Settings and preferences</h3>
      <p style={s.p}>We store your reminder preferences, including your phone number for SMS reminders and your timezone.</p>

      <h3 style={s.h3}>Session data</h3>
      <p style={s.p}>We use authentication cookies set by Supabase to maintain your login session. We do not use third-party analytics or tracking cookies.</p>

      <h2 style={s.h2}>3. How We Use Your Information</h2>
      <p style={s.p}>We use your information to:</p>
      <ul style={s.ul}>
        <li>Operate and provide the Service</li>
        <li>Send reminder notifications (email and SMS) if you enable them</li>
        <li>Maintain your account and settings</li>
      </ul>
      <p style={s.p}>We do not use your data for advertising, marketing, or product analytics.</p>

      <h2 style={s.h2}>4. Third-Party Services</h2>
      <p style={s.p}>We use the following services to operate Keep Contact. Each processes data only as necessary to provide its function and maintains its own privacy policy.</p>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Service</th>
            <th style={s.th}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={s.td}>Supabase</td><td style={s.td}>Authentication and database hosting</td></tr>
          <tr><td style={s.td}>Resend</td><td style={s.td}>Email delivery for reminders</td></tr>
          <tr><td style={s.td}>Twilio</td><td style={s.td}>SMS delivery for reminders</td></tr>
          <tr><td style={s.td}>Vercel</td><td style={s.td}>Frontend hosting</td></tr>
          <tr><td style={s.td}>Railway</td><td style={s.td}>Backend hosting</td></tr>
        </tbody>
      </table>

      <h2 style={s.h2}>5. Data Sharing</h2>
      <p style={s.p}>We do not sell, rent, or trade your personal data to any third parties. We share data only with the service providers listed above, and only as necessary to operate the Service.</p>

      <h2 style={s.h2}>6. Data Retention</h2>
      <p style={s.p}>We retain your data for as long as your account is active. If you delete your account, your data will be retained for 30 days and then permanently deleted. During this period you may contact us to cancel the deletion.</p>

      <h2 style={s.h2}>7. Your Rights</h2>
      <p style={s.p}>You may:</p>
      <ul style={s.ul}>
        <li>Access and correct your data through the Service at any time</li>
        <li>Delete your account and all associated data through the Settings page</li>
        <li>Request a copy of your data by contacting us at the address below</li>
        <li>Request deletion of your data by contacting us at the address below</li>
      </ul>

      <h2 style={s.h2}>8. Data Security</h2>
      <p style={s.p}>We use industry-standard security measures, including encrypted connections (HTTPS) and Supabase authentication, to protect your data. No method of transmission over the Internet is 100% secure.</p>

      <h2 style={s.h2}>9. Children's Privacy</h2>
      <p style={s.p}>The Service is not intended for users under 18 years old. We do not knowingly collect personal information from anyone under 18. If we learn that we have collected information from a minor, we will delete it promptly.</p>

      <h2 style={s.h2}>10. SMS Program</h2>
      <p style={s.p}>Keep Contact operates an SMS reminder program. By enabling SMS reminders in Settings and saving your mobile number, you consent to receive periodic text message digests summarizing overdue check-ins and upcoming events for your contacts.</p>
      <ul style={s.ul}>
        <li><strong>Message frequency:</strong> Varies; typically one message per day when reminders are enabled.</li>
        <li><strong>To opt out:</strong> Reply STOP to any message, or disable SMS reminders in Settings. You will receive a confirmation and no further messages.</li>
        <li><strong>For help:</strong> Reply HELP for information.</li>
        <li><strong>Msg &amp; Data rates may apply.</strong></li>
      </ul>
      <p style={s.p}>Your mobile number is used solely to deliver reminder messages and is never sold or shared with third parties.</p>

      <h2 style={s.h2}>11. Geographic Scope</h2>
      <p style={s.p}>Keep Contact is intended for users in the United States. If you are located outside the United States, please do not use the Service.</p>

      <h2 style={s.h2}>12. Changes to This Policy</h2>
      <p style={s.p}>We may update this Privacy Policy from time to time. Material changes will be communicated by email or in-app notice at least 30 days before taking effect. Continued use of the Service after the effective date constitutes acceptance of the updated policy.</p>

      <h2 style={s.h2}>13. Contact</h2>
      <p style={s.p}>Privacy questions, data access requests, or deletion requests:</p>
      <p style={s.p}><a href="mailto:keepcontactnotifications@gmail.com">keepcontactnotifications@gmail.com</a></p>
    </div>
  )
}
