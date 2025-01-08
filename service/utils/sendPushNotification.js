import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { chunkArray } from "./helperFunctions.js";

initializeApp({
  credential: applicationDefault(),
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
