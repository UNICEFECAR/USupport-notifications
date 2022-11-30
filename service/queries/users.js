import { getDBPool } from "#utils/dbConfig";

export const getUserByID = async (poolCountry, user_id) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT user_id, country_id, type, client_detail_id, notification_preference_id, password
        FROM "user"
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1;
        
    `,
    [user_id]
  );
