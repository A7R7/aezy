import { defineConfig } from 'tsdown'
const external = ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-slots']
export default defineConfig({
  entry: { client: 'src/client/index.tsx' }, outDir: 'lib', format: 'cjs', platform: 'browser',
  target: 'es2022', dts: false, sourcemap: true, clean: true, external,
  define: { 'process.env.NODE_ENV': '"production"' },
  noExternal: source => external.includes(source) ? undefined : true,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "@aezy/observability", factory: (require) => {',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
})
