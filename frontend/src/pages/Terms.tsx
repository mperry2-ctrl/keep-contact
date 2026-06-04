import { Link } from 'react-router-dom'

const s = {
  page: { padding: '2rem', maxWidth: 800, margin: '0 auto', lineHeight: 1.7 },
  back: { display: 'inline-block', marginBottom: '1.5rem', color: '#555', textDecoration: 'none', fontSize: '0.9rem' },
  h1: { marginBottom: '0.25rem' },
  meta: { color: '#666', marginBottom: '2.5rem', fontSize: '0.9rem' },
  h2: { marginTop: '2rem', marginBottom: '0.5rem', fontSize: '1.05rem' },
  p: { marginBottom: '0.75rem' },
  ul: { paddingLeft: '1.5rem', marginBottom: '0.75rem' },
  caps: { fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.01em' },
}

export default function Terms() {
  return (
    <div style={s.page}>
      <Link to="/login" style={s.back}>← Back to login</Link>

      <h1 style={s.h1}>Terms of Service</h1>
      <p style={s.meta}>Effective Date: June 2, 2026 &middot; Operator: Michael Perry</p>

      <h2 style={s.h2}>1. Acceptance</h2>
      <p style={s.p}>By creating an account or using Keep Contact (the "Service"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>

      <h2 style={s.h2}>2. Eligibility</h2>
      <p style={s.p}>You must be at least 18 years old and a resident of the United States to use the Service. By using the Service, you represent and warrant that you meet these requirements.</p>

      <h2 style={s.h2}>3. Description of Service</h2>
      <p style={s.p}>Keep Contact is a personal relationship management tool that helps you track contacts, log interactions, and receive reminders to stay in touch with people in your life.</p>

      <h2 style={s.h2}>4. Account Registration</h2>
      <p style={s.p}>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate, complete information when registering.</p>

      <h2 style={s.h2}>5. Acceptable Use</h2>
      <p style={s.p}>You agree not to use the Service to:</p>
      <ul style={s.ul}>
        <li>Violate any applicable law or regulation</li>
        <li>Harass, stalk, or harm any person</li>
        <li>Store personal data about individuals under 18</li>
        <li>Conduct automated scraping or bulk data collection</li>
        <li>Infringe on any third party's intellectual property rights</li>
      </ul>

      <h2 style={s.h2}>6. Intellectual Property</h2>
      <p style={s.p}>The Service — including its design, code, and branding — is owned by Michael Perry and protected by applicable intellectual property laws. You retain full ownership of the data you enter into the Service. You grant Michael Perry a limited, non-exclusive license to store, process, and transmit your data solely as necessary to operate the Service.</p>

      <h2 style={s.h2}>7. User Data</h2>
      <p style={s.p}>You are responsible for ensuring you have appropriate authority to store personal information about third parties in the Service. By entering third-party personal data, you represent that you have a legitimate personal relationship with those individuals.</p>

      <h2 style={s.h2}>8. Pricing</h2>
      <p style={s.p}>The Service is currently provided free of charge. Michael Perry reserves the right to introduce paid plans in the future. You will receive at least 30 days advance notice before any currently free features become paid. Continued use of the Service after that notice period constitutes acceptance of any new pricing terms.</p>

      <h2 style={s.h2}>9. Account Termination</h2>
      <p style={s.p}>Michael Perry may suspend or terminate your account if you violate these Terms, if your account has been inactive for 12 or more consecutive months, or at Michael Perry's discretion with 30 days advance notice. You may delete your account at any time through the Settings page. Upon termination, your data is retained for 30 days and then permanently deleted.</p>

      <h2 style={s.h2}>10. SMS Program Terms</h2>
      <p style={s.p}><strong>Program name:</strong> Keep Contact SMS Reminders. <strong>Description:</strong> Periodic daily digest messages summarizing overdue contact check-ins and upcoming events.</p>
      <p style={s.p}><strong>Message frequency:</strong> Varies; typically one message per day when SMS reminders are enabled.</p>
      <p style={s.p}><strong>Msg &amp; Data rates may apply.</strong></p>
      <p style={s.p}>To cancel, reply <strong>STOP</strong> to any message. You will receive a confirmation and no further messages. To re-enable, turn SMS reminders back on in Settings.</p>
      <p style={s.p}>For help, reply <strong>HELP</strong> or contact <a href="mailto:keepcontactnotifications@gmail.com">keepcontactnotifications@gmail.com</a>.</p>

      <h2 style={s.h2}>11. Disclaimers</h2>
      <p style={{ ...s.p, ...s.caps }}>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. MICHAEL PERRY DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>

      <h2 style={s.h2}>12. Limitation of Liability</h2>
      <p style={{ ...s.p, ...s.caps }}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, MICHAEL PERRY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. MICHAEL PERRY'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

      <h2 style={s.h2}>13. Dispute Resolution</h2>
      <p style={s.p}>Any dispute arising out of or relating to these Terms or the Service shall be resolved by binding individual arbitration under the rules of the American Arbitration Association (AAA), rather than in court. <strong>You and Michael Perry each waive the right to a jury trial and the right to participate in any class action.</strong></p>
      <p style={s.p}>You may opt out of this arbitration agreement by emailing <a href="mailto:keepcontactnotifications@gmail.com">keepcontactnotifications@gmail.com</a> within 30 days of first accepting these Terms. Your message must include your name, email address, and a clear statement that you wish to opt out of arbitration.</p>
      <p style={s.p}>This arbitration clause does not apply to claims for injunctive or equitable relief.</p>

      <h2 style={s.h2}>14. Governing Law</h2>
      <p style={s.p}>These Terms are governed by the laws of the State of Connecticut, without regard to its conflict of law provisions.</p>

      <h2 style={s.h2}>15. Changes to These Terms</h2>
      <p style={s.p}>Michael Perry may update these Terms from time to time. Material changes will be communicated by email or in-app notice at least 30 days before taking effect. Continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>

      <h2 style={s.h2}>16. Contact</h2>
      <p style={s.p}>Questions about these Terms: <a href="mailto:keepcontactnotifications@gmail.com">keepcontactnotifications@gmail.com</a></p>
    </div>
  )
}
