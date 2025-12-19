const { withProjectBuildGradle, withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

const withNotifeeFix = (config) => {
    // 1. Fix Maven Repository
    config = withProjectBuildGradle(config, (config) => {
        if (!config.modResults.contents.includes('node_modules/@notifee/react-native/android/libs')) {
            config.modResults.contents = config.modResults.contents.replace(
                /allprojects\s*{\s*repositories\s*{/g,
                `allprojects {
        repositories {
            maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`
            );
        }
        return config;
    });

    // 2. Fix Android Manifest - Add foregroundServiceType
    config = withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const mainApplication = manifest.manifest.application[0];

        if (mainApplication.service) {
            const notifeeService = mainApplication.service.find(
                (service) => service.$['android:name'] === 'app.notifee.core.ForegroundService'
            );

            if (notifeeService) {
                // Add specific types required for Android 14
                // We typically need 'shortService' for generic notifications, 
                // and 'location' since this app requests location permissions.
                // Combining them is safe.
                notifeeService.$['android:foregroundServiceType'] = 'location|shortService';
            } else {
                // Configuring if not found (Notifee merges it in, so we might need to add it manually if missing, 
                // but usually standard merge happens first. If we can't find it, we add a node for merge to act upon).
                mainApplication.service.push({
                    $: {
                        'android:name': 'app.notifee.core.ForegroundService',
                        'android:foregroundServiceType': 'location|shortService',
                        'android:exported': 'false' // Safety
                    }
                });
            }
        }

        // 3. Fix Round Icon (missing resource fix)
        // If ic_launcher_round is missing (common in some setups), fallback to ic_launcher
        if (mainApplication.$['android:roundIcon'] === '@mipmap/ic_launcher_round') {
            mainApplication.$['android:roundIcon'] = '@mipmap/ic_launcher';
        }

        return config;
    });

    return config;
};

module.exports = createRunOncePlugin(withNotifeeFix, 'withNotifeeFix', '1.0.0');
