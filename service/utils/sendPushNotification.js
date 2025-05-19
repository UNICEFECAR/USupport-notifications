import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { chunkArray } from "./helperFunctions.js";

const FIREBASE_PRIVATE_KEY_ID = process.env.FIREBASE_PRIVATE_KEY_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_CLIENT_ID = process.env.FIREBASE_CLIENT_ID;
const FIREBASE_CLIENT_X509_CERT_URL = process.env.FIREBASE_CLIENT_X509_CERT_URL;

const serviceAccount = {
  type: "service_account",
  project_id: "usupport-25db0",
  private_key_id: FIREBASE_PRIVATE_KEY_ID,
  private_key: FIREBASE_PRIVATE_KEY,
  client_email: FIREBASE_CLIENT_EMAIL,
  client_id: FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: FIREBASE_CLIENT_X509_CERT_URL,
};

initializeApp({
  credential: cert(serviceAccount),
});

/**
 *
 * @param {*} data
 */
export const sendPushNotification = async ({
  pushTokensArray,
  title,
  body,
}) => {
  if (!Array.isArray(pushTokensArray)) return;
  const chunks = chunkArray(pushTokensArray, 500);
  for (const chunk of chunks) {
    const message = {
      notification: {
        title,
        body,
      },
      tokens: chunk,
    };

    // Returns res object with responses array, which have error property
    await getMessaging().sendEachForMulticast(message);
  }
};
