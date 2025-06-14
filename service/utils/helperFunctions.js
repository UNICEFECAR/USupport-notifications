import { produceSendEmail } from "#utils/kafkaProducers";

import {
  raiseInPlatformNotification,
  raisePushNotification,
} from "#controllers/notifications";

export const handleNotificationConsumerMessage = async ({ message }) => {
  const messageJSON = JSON.parse(message.value.toString());
  /**
   * Each notification has the following properties:
   * - channel: The channel to send the notification to (e.g. email, in-platform, or push)
   * - emailArgs (optional): The arguments to pass to the email controller - contains the email type, recipient email, and email data
   * - inPlatformArgs (optional): The arguments to pass to the in-platform controller - contains the notification type, user ID, and notification data
   * - pushArgs (optional): The arguments to pass to the push controller - contains the notification type, user ID, and notification data
   * - language: The language of the notification
   */
  const { channels, emailArgs, inPlatformArgs, pushArgs, language } =
    messageJSON;

  if (channels.includes("email")) {
    produceSendEmail({
      emailType: emailArgs.emailType,
      language,
      recipientEmail: emailArgs.recipientEmail,
      recipientUserType: emailArgs.recipientUserType,
      data: emailArgs.data,
      country: inPlatformArgs?.country,
    });
  }
  if (channels.includes("in-platform")) {
    raiseInPlatformNotification({
      notificationType: inPlatformArgs.notificationType,
      country: inPlatformArgs.country,
      recipientId: inPlatformArgs.recipientId,
      data: inPlatformArgs.data,
    });
  }

  if (channels.includes("push")) {
    raisePushNotification({
      notificationType: pushArgs.notificationType,
      country: pushArgs.country,
      language,
      pushTokensArray: pushArgs.pushTokensArray,
      data: pushArgs.data,
    });
  }
};

export function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
}

const countriesMap = {
  kz: "kazakhstan",
  pl: "poland",
  ro: "romania",
};

export const getCountryLabelFromAlpha2 = (alpha2) => {
  return countriesMap[alpha2.toLocaleLowerCase()];
};
