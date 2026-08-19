import { Outlet, Navigate } from 'react-router-dom';
import { Typography } from 'antd';
import {
  SafetyCertificateOutlined,
  HistoryOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth.store';

const FEATURES = [
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Full lifecycle control',
    text: 'One source of truth, start to finish.',
    tint: 'rgba(20,166,166,0.14)',
    iconColor: '#0F8A8A',
  },
  {
    icon: <HistoryOutlined />,
    title: 'Immutable audit trail',
    text: 'Nothing is ever overwritten.',
    tint: 'rgba(26,79,209,0.10)',
    iconColor: '#1A4FD1',
  },
  {
    icon: <TeamOutlined />,
    title: 'Role-based access',
    text: 'Everyone sees exactly what they need.',
    tint: 'rgba(245,166,35,0.18)',
    iconColor: '#B5750B',
  },
];

export const AuthLayout = () => {
  const isAuthed = useAuthStore((s) => !!s.accessToken && !!s.user);
  if (isAuthed) return <Navigate to="/assets" replace />;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#ffffff',
      }}
    >
      {/* Brand panel — hidden below a reasonable width so the form always
          gets the full viewport on mobile rather than being squeezed. */}
      <div
        className="auth-brand-panel"
        style={{
          flex: '1 1 46%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 48px',
          color: '#0B2666',
          background: 'linear-gradient(165deg, #FFFFFF 0%, #F3F8FF 55%, #EAF2FF 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative oversized brand-color bands, echoing the logomark,
            for texture on an otherwise flat light panel. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '-18%',
              right: '-14%',
              width: 460,
              height: 460,
              background: '#1A4FD1',
              opacity: 0.06,
              transform: 'rotate(20deg) skewX(-12deg)',
              borderRadius: 32,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6%',
              right: '4%',
              width: 320,
              height: 320,
              background: '#14A6A6',
              opacity: 0.07,
              transform: 'rotate(20deg) skewX(-12deg)',
              borderRadius: 28,
            }}
          />
        </div>

        <img
          src="/sapphire-logo.png"
          alt="Sapphire Virtual Networks"
          style={{ width: 190, height: 'auto', position: 'relative' }}
        />

        <div style={{ maxWidth: 420, position: 'relative' }}>
          <Typography.Title level={2} style={{ color: '#0B2666', marginBottom: 12, fontWeight: 600 }}>
            Every device, accounted for.
          </Typography.Title>
          <Typography.Text style={{ color: '#4A5B7A', fontSize: 15 }}>
            One trusted system for issuance, returns, repairs, and disposal.
          </Typography.Text>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: f.tint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 15,
                    color: f.iconColor,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0B2666' }}>{f.title}</div>
                  <div style={{ color: '#5B6B87', fontSize: 13, marginTop: 2 }}>
                    {f.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Typography.Text style={{ color: '#8695B0', fontSize: 12, position: 'relative' }}>
          Sapphire Virtual Networks Limited &middot; IT Asset Management Platform
        </Typography.Text>
      </div>

      {/* Form panel */}
      <div
        style={{
          flex: '1 1 54%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Outlet />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-brand-panel { display: none; }
        }
      `}</style>
    </div>
  );
};
