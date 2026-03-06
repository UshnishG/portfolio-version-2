import { useEffect, useState } from 'react';

export const GlitchEffect = () => {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const triggerGlitch = () => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 100);
    };

    // Random glitch every 5-15 seconds
    const scheduleNextGlitch = () => {
      const delay = Math.random() * 10000 + 5000; // 5-15 seconds
      setTimeout(() => {
        triggerGlitch();
        scheduleNextGlitch();
      }, delay);
    };

    scheduleNextGlitch();
  }, []);

  if (!glitchActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Horizontal glitch lines */}
      <div 
        className="absolute left-0 right-0 h-[2px] bg-accent opacity-70"
        style={{
          top: `${Math.random() * 80 + 10}%`,
          boxShadow: '0 0 10px currentColor'
        }}
      />
      <div 
        className="absolute left-0 right-0 h-[1px] bg-foreground opacity-50"
        style={{
          top: `${Math.random() * 80 + 10}%`,
        }}
      />
    </div>
  );
};
