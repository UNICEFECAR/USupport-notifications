import { produceSendEmail } from "#utils/kafkaProducers";
import fetch from "node-fetch";

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
  am: "armenia",
};

export const getCountryLabelFromAlpha2 = (alpha2) => {
  return countriesMap[alpha2.toLocaleLowerCase()];
};

export const fetchClientMoodReport = async ({
  country,
  language,
  userId,
  startDateISO,
  endDateISO,
}) => {
  try {
    const CLIENT_URL = process.env.CLIENT_URL;
    const CLIENT_LOCAL_HOST = "http://localhost:3001";

    if (!CLIENT_URL) {
      console.log("fetchClientMoodReport error: CLIENT_URL is not defined");
      return null;
    }

    const url = `${CLIENT_URL}/client/v1/mood-tracker/report?startDate=${encodeURIComponent(
      startDateISO
    )}&endDate=${encodeURIComponent(endDateISO)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-country-alpha-2": country,
        "x-language-alpha-2": language,
        "x-user-id": userId,
        "Content-type": "application/json",
        host: CLIENT_LOCAL_HOST,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.log("fetchClientMoodReport error", e);
    return null;
  }
};
