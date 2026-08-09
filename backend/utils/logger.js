function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  info: (msg) => console.log(`[${timestamp()}] ℹ️  ${msg}`),
  warn: (msg) => console.warn(`[${timestamp()}] ⚠️  ${msg}`),
  error: (msg) => console.error(`[${timestamp()}] ❌ ${msg}`),
  success: (msg) => console.log(`[${timestamp()}] ✅ ${msg}`)
};
