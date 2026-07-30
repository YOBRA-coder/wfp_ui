import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yobbytech.yobbyforex',
  appName: 'YobbyForex',
  webDir: 'dist',
  backgroundColor: '#07090D',
  android: {
    allowMixedContent: false, // backend must be served over HTTPS in production
  },
};

export default config;
