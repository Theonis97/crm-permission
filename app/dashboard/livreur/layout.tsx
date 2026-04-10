import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
}

export default function LivreurLayout({ children }: { children: React.ReactNode }) {
  return children
}
