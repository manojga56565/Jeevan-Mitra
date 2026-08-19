const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[36m'
};
const ts = () => new Date().toISOString();

module.exports = {
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${ts()} — ${msg}`),
  error:   (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${ts()} — ${msg}`),
  warn:    (msg) => console.warn(`${colors.yellow}[WARN]${colors.reset} ${ts()} — ${msg}`),
  info:    (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${ts()} — ${msg}`)
};
