import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_STYLE: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-gray-800",
  secondary: "border text-gray-700 hover:bg-gray-50 hover:border-gray-400",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

// Kelas dasar dipakai di <button> maupun <Link> supaya perilakunya konsisten:
// - cursor-pointer: cursor jadi tangan (default browser sebenarnya sudah
//   begitu untuk <button>, tapi eksplisit di sini biar konsisten juga
//   dipakai di <Link> yang ber-style tombol)
// - transition-*: dasar buat animasi hover & klik
// - active:scale-95: efek "ditekan" sesaat pas diklik
// - disabled:*: state nonaktif jelas kelihatan beda
const BASE =
  "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium " +
  "cursor-pointer transition-all duration-150 ease-out " +
  "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${BASE} ${VARIANT_STYLE[variant]} ${className}`}
      {...props}
    />
  );
}

// Versi Link untuk kasus tombol yang sebenarnya navigasi (mis. tombol "Edit"),
// supaya tetap pakai <a>/<Link> (semantik & SEO benar) tapi terlihat &
// terasa persis seperti tombol.
export function LinkButton({
  href,
  variant = "secondary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANT_STYLE[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
