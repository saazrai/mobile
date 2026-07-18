// Pre-setup for Jest to initialize NativeModules before jest-expo's setup runs
// This prevents errors when jest-expo tries to access NativeModules.UIManager

try {
  // Try to require NativeModules and ensure it's an object
  const NativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');

  // If UIManager isn't defined, create it as an empty object
  if (NativeModules && typeof NativeModules === 'object') {
    if (!NativeModules.UIManager) {
      NativeModules.UIManager = {};
    }
    // Ensure it's actually an object, not undefined/null
    if (typeof NativeModules.UIManager !== 'object') {
      NativeModules.UIManager = {};
    }
  }
} catch (e) {
  // Native modules not available in this environment
  // This is okay for pure utility tests
}
