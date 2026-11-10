import React from 'react';

const PlaceholderPage = ({ title }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '400px' }}>
        This module is currently under development. Please check back later.
      </p>
    </div>
  );
};

export default PlaceholderPage;
