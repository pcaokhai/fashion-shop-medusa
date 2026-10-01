// Fail-closed parser for the docs/13 §4.2 motion table (dur/ease are also parsed by master.ts parseMotion).
export interface MotionDoc {
  dur: Record<string, number>;
  ease: Record<string, number[]>;
  spring: Record<string, { stiffness: number; damping: number }>;
  stagger: { stepMs: number; max: number };
  distance: Record<string, number>;
}

function row(docs: string, token: string): string {
  const m = new RegExp(`^\\| \`${token.replace(/[.-]/g, "\\$&")}\` \\| ([^|]+) \\|`, "m").exec(docs);
  if (!m) throw new Error(`docs/13 §4.2: row ${token} not found`);
  return (m[1] as string).replace(/`/g, "").trim();
}

function num(re: RegExp, text: string, what: string): RegExpExecArray {
  const m = re.exec(text);
  if (!m) throw new Error(`docs/13 §4.2: malformed ${what}: ${text}`);
  return m;
}

export function parseMotionDoc(docs: string): MotionDoc {
  const out: MotionDoc = { dur: {}, ease: {}, spring: {}, stagger: { stepMs: 0, max: 0 }, distance: {} };
  for (const k of ["instant", "fast", "base", "slow", "expressive"]) {
    out.dur[k] = Number(num(/^(\d+)ms$/, row(docs, `--dur-${k}`), `--dur-${k}`)[1]);
  }
  for (const k of ["standard", "enter", "exit"]) {
    const m = num(/^cubic-bezier\(([^)]+)\)$/, row(docs, `--ease-${k}`), `--ease-${k}`);
    out.ease[k] = (m[1] as string).split(",").map(Number);
  }
  for (const k of ["drawer", "pop"]) {
    const m = num(/^stiffness (\d+), damping (\d+)$/, row(docs, `spring.${k}`), `spring.${k}`);
    out.spring[k] = { stiffness: Number(m[1]), damping: Number(m[2]) };
  }
  const s = num(/^(\d+)ms, max (\d+) items then 0$/, row(docs, "stagger"), "stagger");
  out.stagger = { stepMs: Number(s[1]), max: Number(s[2]) };
  const d = num(/^(\d+)px \(small\), (\d+)px \(reveal\), (\d+)px \(hero\)$/, row(docs, "distance"), "distance");
  out.distance = { small: Number(d[1]), reveal: Number(d[2]), hero: Number(d[3]) };
  return out;
}
