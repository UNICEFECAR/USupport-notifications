import { getDBPool } from "#utils/dbConfig";

export const addNotificationQuery = async ({
  poolCountry,
  notificationType,
  recipientId,
  data,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
    INSERT INTO notification (type, user_id, content)
    VALUES ($1, $2, $3::jsonb)
    RETURNING *;
    `,
    [notificationType, recipientId, data]
  );

export const getNotificationsByUserIdQuery = async ({ poolCountry, userId }) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      SELECT * FROM notification WHERE user_id = $1;
      `,
    [userId]
  );

export const updateNotificationIsReadQuery = async ({
  poolCountry,
  notificationId,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      UPDATE notification
      SET is_read = true
      WHERE notification_id = $1
      RETURNING *;
      `,
    [notificationId]
  );
