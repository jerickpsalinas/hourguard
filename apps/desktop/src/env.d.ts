// Env vars injected into the Electron main bundle by electron-vite at build
// time. Only MAIN_VITE_-prefixed vars are exposed to the main process.
interface ImportMetaEnv {
  readonly MAIN_VITE_SUPABASE_URL: string;
  readonly MAIN_VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
