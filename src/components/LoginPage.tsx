import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError("Invalid email or password.");
  };

  const ACCENT   = 'oklch(42% 0.11 200)';
  const TEXT_1   = 'oklch(15% 0.013 210)';
  const TEXT_3   = 'oklch(62% 0.013 210)';
  const SURFACE  = 'oklch(99.5% 0.003 210)';
  const BORDER   = 'oklch(87% 0.015 210)';
  const BG       = 'oklch(96.5% 0.009 210)';
  const SB_ACCENT = 'oklch(52% 0.055 200)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    color: TEXT_1,
    fontFamily: '"Hanken Grotesk", sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: '"Hanken Grotesk", sans-serif' }}>

      {/* Top bar */}
      <div style={{ padding: '28px 40px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: TEXT_1, fontSize: '15px', fontWeight: 600 }}>
          Ilir Hoti
        </span>
        <span style={{ color: SB_ACCENT, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
          Web Design
        </span>
      </div>

      {/* Centred form area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>

          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ fontFamily: '"Bricolage Grotesque", sans-serif', color: TEXT_1, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 6px' }}>
              Welcome back
            </h1>
            <p style={{ color: TEXT_3, fontSize: '13px', margin: 0 }}>
              Admin access only
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: TEXT_3, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT}
                onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = BORDER}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: TEXT_3, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={inputStyle}
                onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT}
                onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = BORDER}
              />
            </div>

            {error && (
              <p style={{ color: 'oklch(52% 0.18 22)', fontSize: '12px', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: ACCENT,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '13px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: '"Hanken Grotesk", sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginTop: '4px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'center' }}>
        <p style={{ color: TEXT_3, fontSize: '11px', margin: 0, letterSpacing: '0.02em' }}>
          © {new Date().getFullYear()} Ilir Hoti Web Design
        </p>
      </div>
    </div>
  );
}
