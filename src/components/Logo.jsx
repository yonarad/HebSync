import React from 'react';

export default function Logo({ className = "w-10 h-10" }) {
  return (
    <img
      src="/HebSyncLogo.png"
      alt="HebSync logo"
      className={className}
    />
  );
}
