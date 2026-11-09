type Style = (text: string) => string;

export interface Colors {
  red: Style;
  yellow: Style;
  green: Style;
  dim: Style;
  bold: Style;
  underline: Style;
}

const ansi =
  (open: number, close: number): Style =>
  (text) =>
    `\u001b[${open}m${text}\u001b[${close}m`;

const plain: Style = (text) => text;

export function createColors(enabled: boolean): Colors {
  if (!enabled) {
    return { red: plain, yellow: plain, green: plain, dim: plain, bold: plain, underline: plain };
  }
  return {
    red: ansi(31, 39),
    yellow: ansi(33, 39),
    green: ansi(32, 39),
    dim: ansi(2, 22),
    bold: ansi(1, 22),
    underline: ansi(4, 24),
  };
}

/** Honors NO_COLOR and FORCE_COLOR, otherwise colors only real terminals. */
export function supportsColor(
  stream: { isTTY?: boolean },
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== "0";
  return Boolean(stream.isTTY) && env.TERM !== "dumb";
}
