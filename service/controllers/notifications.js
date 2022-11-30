import {
  addNotificationQuery,
  getNotificationsByUserIdQuery,
  updateNotificationIsReadQuery,
} from "#queries/notifications";

import { notificationNotFound } from "#utils/errors";

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

export const getNotificationsByUserId = async ({ country, userId }) => {
  return await getNotificationsByUserIdQuery({ poolCountry: country, userId })
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

export const updateNotificationIsRead = async ({
  country,
  language,
  notificationId,
}) => {
  return await updateNotificationIsReadQuery({
    poolCountry: country,
    notificationId,
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
