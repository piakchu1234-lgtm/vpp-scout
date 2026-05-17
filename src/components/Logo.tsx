type Props = {
  size?: number;
  className?: string;
  color?: string;
};

export function Logo({ size = 24, className, color = '#DC2626' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        stroke={color}
        strokeWidth="2.75"
      />
      <line
        x1="12"
        y1="9.5"
        x2="12"
        y2="14.5"
        stroke={color}
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <line
        x1="9.5"
        y1="12"
        x2="14.5"
        y2="12"
        stroke={color}
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
