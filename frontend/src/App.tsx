import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import ContactForm from './pages/ContactForm'
import Settings from './pages/Settings'
import ImportContacts from './pages/ImportContacts'
import Profile from './pages/Profile'

function Nav() {
  const loc = useLocation()
  const linkStyle = (path: string) => ({
    textDecoration: 'none',
    fontWeight: loc.pathname === path ? 700 : 400,
    color: loc.pathname.startsWith(path) ? '#000' : '#555',
  })
  return (
    <nav style={{ borderBottom: '1px solid #eee', padding: '0.75rem 2rem', display: 'flex', gap: '1.5rem' }}>
      <Link to="/" style={linkStyle('/')}>Home</Link>
      <Link to="/contacts" style={linkStyle('/contacts')}>Contacts</Link>
      <Link to="/import" style={linkStyle('/import')}>Import</Link>
      <Link to="/profile" style={linkStyle('/profile')}>My Profile</Link>
      <Link to="/settings" style={{ ...linkStyle('/settings'), marginLeft: 'auto' }}>Settings</Link>
    </nav>
  )
}

function ProtectedLayout({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <BrowserRouter>
      {session && <Nav />}
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedLayout session={session}><Dashboard /></ProtectedLayout>} />
        <Route path="/contacts" element={<ProtectedLayout session={session}><Contacts /></ProtectedLayout>} />
        <Route path="/contacts/new" element={<ProtectedLayout session={session}><ContactForm /></ProtectedLayout>} />
        <Route path="/contacts/:id" element={<ProtectedLayout session={session}><ContactDetail /></ProtectedLayout>} />
        <Route path="/contacts/:id/edit" element={<ProtectedLayout session={session}><ContactForm /></ProtectedLayout>} />
        <Route path="/import" element={<ProtectedLayout session={session}><ImportContacts /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout session={session}><Profile /></ProtectedLayout>} />
        <Route path="/settings" element={<ProtectedLayout session={session}><Settings /></ProtectedLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
