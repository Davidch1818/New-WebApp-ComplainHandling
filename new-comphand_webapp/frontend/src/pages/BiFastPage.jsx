import React from 'react';

const BiFastPage = () => {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>BiFast Reconciliation</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Upload and reconcile CBS vs BiFast statements.
      </p>

      <div className="glass-panel" style={{ padding: '2rem', background: 'var(--color-bg-surface)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>File Upload</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Core File */}
          <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Drag & Drop CBS File Here</div>
            <button style={{ background: 'var(--color-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
              Browse Files
            </button>
          </div>

          {/* Biller File */}
          <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Drag & Drop BiFast File Here</div>
            <button style={{ background: 'var(--color-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
              Browse Files
            </button>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ background: 'var(--color-success)', color: 'white', padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)', fontWeight: '600', boxShadow: 'var(--shadow-sm)' }}>
            Start Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiFastPage;
