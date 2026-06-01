import React from 'react';

export function Panel({ theme, children, style, accent }) {
  const T = theme;
  return (
    <div
      style={{
        background: T.surf,
        border: '2px solid ' + (accent || T.line),
        boxShadow: `0 4px 0 ${T.bg0}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
