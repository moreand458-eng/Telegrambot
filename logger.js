// ⚔️ ESCANOR — لوجر التيليجرام

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

const wrap = (clr, tag, ...args) =>
  console.log(`${c[clr]}⚔️  [TG | ${new Date().toLocaleTimeString('ar-EG', { hour12: false })}] ${tag}${c.reset}`, ...args);

export const logger = {
  info:    (...a) => wrap('cyan',   'INFO',    ...a),
  success: (...a) => wrap('green',  'OK',      ...a),
  warn:    (...a) => wrap('yellow', 'WARN',    ...a),
  error:   (...a) => wrap('red',    'ERROR',   ...a),
  cmd:     (...a) => wrap('gray',   'CMD',     ...a),
};

export default logger;
