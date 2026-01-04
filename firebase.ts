
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const env = (window as any).process.env;

// Only initialize if we have at least an API key
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY || "",
  authDomain: env.FIREBASE_AUTH_DOMAIN || "",
  projectId: env.FIREBASE_PROJECT_ID || "",
  storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);

let messaging: any = null;

/**
 * Initializes messaging safely for the browser environment.
 * Validates config and browser support to prevent "Service messaging not available" errors.
 */
export const initMessaging = async () => {
  try {
    if (messaging) return messaging;
    
    // 1. Check browser support (must be HTTPS or localhost)
    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM: Browser environment does not support Cloud Messaging (Requires HTTPS).");
      return null;
    }

    // 2. Validate that we actually have the required sender ID
    if (!firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId === "") {
      console.warn("FCM: messagingSenderId is missing. Push notifications disabled.");
      return null;
    }

    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error("FCM: Initialization failed:", error);
    return null;
  }
};

/**
 * Listens for messages when the app is in the foreground.
 * Includes defensive checks to ensure messaging is active.
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  initMessaging().then(m => {
    if (m) {
      try {
        onMessage(m, (payload) => {
          callback(payload);
        });
      } catch (e) {
        console.error("FCM: Could not attach foreground listener:", e);
      }
    }
  });
};

export { getToken };
