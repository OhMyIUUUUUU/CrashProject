const { withProjectBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');

const withNotifeeFix = (config) => {
    return withProjectBuildGradle(config, (config) => {
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
};

module.exports = createRunOncePlugin(withNotifeeFix, 'withNotifeeFix', '1.0.0');
