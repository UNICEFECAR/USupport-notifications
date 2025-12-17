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
  am: "armenia",
  cy: "cyprus",
  ps: "playandheal",
};

export const getCountryLabelFromAlpha2 = (alpha2) => {
  return countriesMap[alpha2.toLocaleLowerCase()];
};

const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export const calculateMoodSummary = (
  moodTracks,
  startDateISO,
  endDateISO,
  language,
  t
) => {
  const dateRange = `${formatDateToDDMMYYYY(
    startDateISO
  )} - ${formatDateToDDMMYYYY(endDateISO)}`;

  // Calculate mood counts
  const moodCounts = {};
  moodTracks.forEach((moodTrack) => {
    moodCounts[moodTrack.mood] = (moodCounts[moodTrack.mood] || 0) + 1;
  });

  // Find the most selected mood
  let mostSelectedMood = "N/A";
  let maxCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostSelectedMood = t(`mood_${mood}`, language) || mood;
    }
  });

  // Sort moods by frequency for breakdown
  const moodBreakdown = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([mood, count]) => ({
      mood: t(`mood_${mood}`, language) || mood,
      count,
      percentage: ((count / moodTracks.length) * 100).toFixed(1),
    }));

  return {
    dateRange,
    totalMoodTracks: moodTracks.length,
    mostSelectedMood,
    mostSelectedMoodCount: maxCount,
    moodBreakdown,
  };
};
