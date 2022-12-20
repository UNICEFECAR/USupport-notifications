import {
  addNotificationQuery,
  getNotificationsByUserIdQuery,
  getUnreadNotificationsByUserIdQuery,
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
