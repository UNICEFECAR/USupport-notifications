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

export const getNotificationsByUserIdQuery = async ({
  poolCountry,
  userId,
  pageNo,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      SELECT * FROM notification WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      OFFSET $2;
    `,
    [userId, (pageNo - 1) * 10]
  );

export const getUnreadNotificationsByUserIdQuery = async ({
  poolCountry,
  userId,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      SELECT * FROM notification WHERE user_id = $1 AND is_read = false;
    `,
    [userId]
  );

export const updateNotificationIsReadQuery = async ({
  poolCountry,
  notificationIds,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      UPDATE notification
      SET is_read = true
      WHERE notification_id = ANY($1)
      RETURNING *;
    `,
    [notificationIds]
  );
