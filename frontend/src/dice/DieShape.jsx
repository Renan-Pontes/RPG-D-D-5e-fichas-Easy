// Dado 2D (SVG) — usado nos botões do rolador e como fallback quando não há
// WebGL, o usuário prefere menos movimento ou escolheu animação simples.
const DICE_FACES = {
  4: 'M50 5 L95 90 L5 90 Z',
  6: 'M15 15 H85 V85 H15 Z',
  8: 'M50 5 L90 50 L50 95 L10 50 Z',
  10: 'M50 5 L88 35 L75 92 L25 92 L12 35 Z',
  12: 'M50 5 L88 28 L88 72 L50 95 L12 72 L12 28 Z',
  20: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
  100: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
};

export default function DieShape({ die, value, rolling = false, size = 56, seed = 0, dimmed = false }) {
  const rand = (n) => {
    const x = Math.sin(seed * 9999 + n) * 10000;
    return x - Math.floor(x);
  };
  const style = rolling ? {
    width: size,
    height: size,
    '--sx': `${(rand(1) - 0.5) * 120}vw`,
    '--sy': `${(rand(2) - 0.5) * 80}vh`,
    '--mx1': `${(rand(3) - 0.5) * 60}vw`,
    '--my1': `${-30 - rand(4) * 30}vh`,
    '--mx2': `${(rand(5) - 0.5) * 40}vw`,
    '--my2': `${-15 - rand(6) * 25}vh`,
    '--mx3': `${(rand(7) - 0.5) * 20}vw`,
    '--my3': `${-5 - rand(8) * 15}vh`,
    '--rot': `${1440 + Math.floor(rand(9) * 720)}deg`,
    '--dur': `${1.2 + rand(10) * 0.4}s`,
  } : { width: size, height: size, opacity: dimmed ? 0.4 : 1 };
  return (
    <div className={`die-shape die-d${die} ${rolling ? 'rolling' : ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <path d={DICE_FACES[die] || DICE_FACES[20]} className="die-poly"/>
      </svg>
      <span className="die-number" style={{ fontSize: size * 0.36 }}>{value ?? '?'}</span>
    </div>
  );
}
