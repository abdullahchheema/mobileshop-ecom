// Re-mounts on every navigation, so each page eases in. Reduced-motion visitors get no movement.
export default function ShopTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">{children}</div>;
}
