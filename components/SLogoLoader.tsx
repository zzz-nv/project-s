export default function SLogoLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  const wrapper = fullscreen
    ? 'min-h-screen bg-background flex items-center justify-center'
    : 'flex items-center justify-center';

  return (
    <div className={wrapper}>
      <img src="/S_logo.svg" alt="S" className="w-16 h-16 animate-pulse" />
    </div>
  );
}