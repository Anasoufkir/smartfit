/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.anasoufkir.smartfit',
  appName: 'SmartFit',
  webDir: 'public',
  server: {
    url: 'https://fit.anasoufkir.com',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080808',
      showSpinner: true,
      spinnerColor: '#e8341c',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080808',
      overlaysWebView: false
    }
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#080808'
  },
  android: {
    backgroundColor: '#080808',
    allowMixedContent: false
  }
};

module.exports = config;
