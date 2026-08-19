interface Props {
  size?: number;
}

// Layered-band mark matching the Sapphire Virtual Networks brand: three
// staggered parallelograms (blue / teal / sky) with an amber accent dot.
export const SapphireMark = ({ size = 32 }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <polygon points="12,6 34,6 24,22 2,22" fill="#1A4FD1" />
    <polygon points="18,14 40,14 30,30 8,30" fill="#14A6A6" />
    <polygon points="14,22 36,22 26,38 4,38" fill="#9FE0EE" />
    <circle cx="33" cy="35" r="4.5" fill="#F5A623" />
  </svg>
);
