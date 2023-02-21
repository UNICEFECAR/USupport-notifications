import { Expo } from "expo-server-sdk";

/**
 *
 * @param {*} data
 */
export const sendPushNotification = ({
  pushTokensArray,
  title,
  body,
  navigationData,
  clientDetailId,
}) => {
  if (!Array.isArray(pushTokensArray)) return;
  const expo = new Expo();
  const messages = [];
  for (const pushToken of pushTokensArray) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(
        `Push token ${pushToken} belonging to ${clientDetailId} is not a valid Expo push token`
      );
      continue;
    }
    messages.push({
      to: pushToken,
      sound: "default",
      title,
      body,
      data: {
        navigationData,
        clientDetailId,
      },
    });
  }
  const chunks = expo.chunkPushNotifications(messages);

  const tickets = [];
  (async () => {
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error, "error");
      }
    }
  })();
};
