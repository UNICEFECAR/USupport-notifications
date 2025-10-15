import {
  addNotificationQuery,
  getNotificationsByUserIdQuery,
  getUnreadNotificationsByUserIdQuery,
  readAllNotificationsByUserIdQuery,
  updateNotificationIsReadQuery,
} from "#queries/notifications";

import { notificationNotFound } from "#utils/errors";

import { t } from "#translations/index";
import { sendPushNotification } from "#utils/sendPushNotification";

export const raiseInPlatformNotification = async ({
  notificationType,
  country,
  recipientId,
  data,
}) => {
  return await addNotificationQuery({
    poolCountry: country,
    notificationType,
    recipientId,
    data,
  }).catch((err) => {
    throw err;
  });
};

export const getNotificationsByUserId = async ({ country, userId, pageNo }) => {
  return await getNotificationsByUserIdQuery({
    poolCountry: country,
    userId,
    pageNo,
  })
    .then((res) => {
      if (res.rowCount === 0) {
        return [];
      } else {
        return res.rows;
      }
    })
    .catch((err) => {
      throw err;
    });
};

export const getHasUnreadNotificationsByUserId = async ({
  country,
  userId,
}) => {
  return await getUnreadNotificationsByUserIdQuery({
    poolCountry: country,
    userId,
  })
    .then((res) => {
      if (res.rowCount === 0) {
        return false;
      } else {
        return true;
      }
    })
    .catch((err) => {
      throw err;
    });
};

export const updateNotificationIsRead = async ({
  country,
  language,
  notificationIds,
}) => {
  return await updateNotificationIsReadQuery({
    poolCountry: country,
    notificationIds,
  })
    .then((res) => {
      if (res.rowCount === 0) {
        return notificationNotFound(language);
      } else {
        return res.rows[0];
      }
    })
    .catch((err) => {
      throw err;
    });
};

export const raisePushNotification = async ({
  notificationType,
  language,
  pushTokensArray,
  data,
}) => {
  let notificationTitle, notificationMessage, navigationData;
  switch (notificationType) {
    case "consultation_booking":
      notificationTitle = t("consultation_booking", language);
      notificationMessage = t("consultation_booking_message", language, [
        data.providerName,
      ]);
      break;
    case "consultation_suggestion":
      notificationTitle = t("consultation_suggestion", language);
      notificationMessage = t("consultation_suggestion_message", language, [
        data.providerName,
      ]);
      break;
    case "consultation_cancellation":
      notificationTitle = t("consultation_cancellation", language);
      notificationMessage = t(
        data.canceledBy === "client"
          ? "consultation_cancellation_message"
          : "consultation_cancellation_by_provider_message",
        language,
        [data.providerName]
      );
      break;
    case "consultation_suggestion_booking":
      notificationTitle = t("consultation_suggestion_booking", language);
      notificationMessage = t(
        "consultation_suggestion_booking_message",
        language,
        [data.providerName]
      );
      break;
    case "consultation_reschedule":
      notificationTitle = t("consultation_reschedule", language);
      notificationMessage = t("consultation_reschedule_message", language, [
        data.providerName,
      ]);
      break;
    case "consultation_remind_start":
      notificationTitle = t("consultation_reminder", language);
      notificationMessage = t("consultation_reminder_message", language, [
        data.providerName,
        data.minToConsultation,
      ]);
      break;
    case "consultation_remind_start_24_hours_before":
      notificationTitle = t("consultation_reminder_24_hours_before", language);
      notificationMessage = t(
        "consultation_reminder_24_hours_before_message",
        language,
        [data.providerName]
      );
      break;
    case "consultation_remind_start_48_hours_before":
      notificationTitle = t("consultation_reminder_48_hours_before", language);
      notificationMessage = t(
        "consultation_reminder_48_hours_before_message",
        language,
        [data.providerName]
      );
      break;
    case "consultation_started":
      notificationTitle = t("consultation_started", language);
      notificationMessage = t("consultation_started_message", language, [
        data.providerName,
      ]);
      break;
    case "question_answered":
      notificationTitle = t("question_answered", language);
      notificationMessage = t("question_answered_message", language, [
        data.providerName,
      ]);
      navigationData = {
        screen: "MyQADetails",
        params: {
          questionId: data.questionId,
        },
      };
      break;
    case "mood_tracker":
      notificationTitle = t("mood_tracker_reminder", language);
      notificationMessage = t("mood_tracker_reminder_message", language);
      break;
    case "mood_tracker_weekly_success":
      notificationTitle = t("mood_tracker_weekly_success", language);
      notificationMessage = t("mood_tracker_weekly_success_message", language, [
        data.times,
      ]);
      break;
    case "mood_tracker_weekly_encouragement":
      notificationTitle = t("mood_tracker_weekly_encouragement", language);
      notificationMessage = t(
        "mood_tracker_weekly_encouragement_message",
        language
      );
      break;
    case "baseline_assessment_followup":
      notificationTitle = t("baseline_assessment_followup", language);
      notificationMessage = t("baseline_assessment_followup_message", language);
      break;
    default:
      break;
  }

  sendPushNotification({
    pushTokensArray,
    title: notificationTitle,
    body: notificationMessage,
    navigationData,
    clientDetailId: data?.clientDetailId,
  });
};

export const readAllNotificationsByUserId = async ({ country, userId }) => {
  return await readAllNotificationsByUserIdQuery({
    poolCountry: country,
    userId,
  })
    .then((res) => {
      if (res.rowCount === 0) {
        return { success: true };
      } else {
        return res.rows[0];
      }
    })
    .catch((err) => {
      throw err;
    });
};
