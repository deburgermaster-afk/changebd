interface BangladeshFlagProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BangladeshFlag({ size = "md", className = "" }: BangladeshFlagProps) {
  const sizes = {
    sm: { width: 24, height: 14.4, circle: 4.5 },
    md: { width: 40, height: 24, circle: 7.5 },
    lg: { width: 60, height: 36, circle: 11.25 },
  };

  const { width, height, circle } = sizes[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 60"
      className={className}
      aria-label="Bangladesh Flag"
    >
      <rect width="100" height="60" fill="#006A4E" />
      <circle cx="45" cy="30" r={circle * 2.5} fill="#F42A41" />
    </svg>
  );
}

export function BangladeshFlagIcon({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width="20" height="12" viewBox="0 0 100 60" aria-label="BD">
        <rect width="100" height="60" fill="#006A4E" />
        <circle cx="45" cy="30" r="18" fill="#F42A41" />
      </svg>
    </div>
  );
}
