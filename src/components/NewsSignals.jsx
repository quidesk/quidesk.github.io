import React from 'react';
import { AlertTriangle, Activity, Radio } from 'lucide-react';

export default function NewsSignals({ signals = [] }) {
  // Fallback dummy data just in case no real signals are passed in yet
  const displaySignals = signals.length > 0 ? signals : [
    {
      id: 1,
      type: 'GLOBAL_MACRO',
      time: '2m ago',
      message: 'Central bank divergence flagged in recent policy minutes.',
      color: '#eab308', // Amber
      icon: AlertTriangle
    },
    {
      id: 2,
      type: 'SEC_NODE',
      time: '1h ago',
      message: 'Unusual filing activity detected in micro-cap tech sector.',
      color: '#10b981', // Emerald
      icon: Activity
    },
    {
      id: 3,
      type: 'GEO_POL',
      time: '3h ago',
      message: 'Energy supply chain disruptions reported in Eastern Europe.',
      color: '#f43f5e', // Rose
      icon: Radio
    }
  ];

  return (
    <div style={{
      background: '#11131a', // Deep terminal background
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
        <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}>
          OSINT SIGNALS
        </span>
        <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
          UPDATES EVERY 30S
        </span>
      </div>

      {/* Feed Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
        {displaySignals.map((signal, index) => {
          // If real data doesn't have an icon component, default to Radio
          const Icon = signal.icon || Radio;
          const signalColor = signal.color || '#38bdf8'; // Default Sky Blue

          return (
            <div key={signal.id || index} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.03)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: signalColor }}>
                  <Icon size={14} />
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {signal.type || 'SYS_ALERT'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{signal.time || 'Just now'}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
                {signal.message || signal.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <button style={{
        marginTop: '8px',
        width: '100%',
        background: 'transparent',
        border: '1px solid rgba(234, 179, 8, 0.5)', 
        color: '#eab308',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: '0.5px',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        e.target.style.background = 'rgba(234, 179, 8, 0.1)';
        e.target.style.borderColor = '#eab308';
      }}
      onMouseOut={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.borderColor = 'rgba(234, 179, 8, 0.5)';
      }}>
        VIEW FULL OSINT FEED
      </button>
    </div>
  );
}