import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stellaris.hrm',
  appName: 'Stellaris HRM',
  webDir: 'out',
  server: {
    url: 'https://v0-stellaris-hrm.vercel.app',
    cleartext: true
  }
};

export default config;
