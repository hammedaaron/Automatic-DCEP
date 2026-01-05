
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const env = (window as any).process.env;

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY || "",
  authDomain: env.FIREBASE_AUTH_DOMAIN || "",
  projectId: env.FIREBASE_PROJECT_ID || "",
  storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);

let messagingInstance: any = null;

/**
 * Initializes messaging safely for the browser environment.
 */
export const initMessaging = async () => {
  try {
    if (messagingInstance) return messagingInstance;
    
    // 1. Check basic browser support
    const supported = await isSupported();
    if (!supported) return null;

    // 2. Explicit check for indexedDB (Firebase Messaging requirement)
    if (!window.indexedDB) {
      console.warn("FCM: IndexedDB is not supported or is blocked in this browser.");
      return null;
    }

    // 3. Check for secure context
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn("FCM: Secure context (HTTPS) required for messaging.");
      return null;
    }

    // 4. Validate config
    if (!firebaseConfig.messagingSenderId) return null;

    try {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    } catch (innerError) {
      // This is usually where "Service messaging is not available" is caught
      return null;
    }
  } catch (error) {
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  initMessaging().then(m => {
    if (m) {
      try {
        onMessage(m, (payload) => {
          callback(payload);
        });
      } catch (e) {
        console.warn("FCM: Could not attach foreground listener:", e);
      }
    }
  });
};

export { getToken };
