import { getDBPool } from "#utils/dbConfig";

export const getUserByID = async (poolCountry, user_id) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT user_id, country_id, type, client_detail_id, notification_preference_id, password
        FROM "user"
        WHERE deleted_at is NULL AND user_id = $1
        ORDER BY created_at DESC
        LIMIT 1;
        
    `,
    [user_id]
  );

export const getClientsDetailsForUpcomingConsultationsQuery = async ({
  poolCountry,
  clientIds,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
      SELECT 
        "user".user_id AS userId, 
        "client_detail".client_detail_id AS id, 
        "client_detail".email AS email, 
        "notification_preference".email AS emailNotificationsEnabled, 
        "notification_preference".consultation_reminder_min[1] AS consultationReminderMin, 
        "client_detail".push_notification_tokens, 
        "user".language
      FROM 
        "user"
        INNER JOIN "client_detail" ON "user".client_detail_id = "client_detail".client_detail_id
        INNER JOIN "notification_preference" ON "user".notification_preference_id = "notification_preference".notification_preference_id
      WHERE 
          "user".deleted_at IS NULL 
          AND "user".client_detail_id = ANY($1::UUID[]) 
          AND "notification_preference".consultation_reminder = true;

    `,
    [clientIds]
  );

export const getProvidersDetailsForUpcomingConsultationsQuery = async ({
  poolCountry,
  providerIds,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT "user".user_id as userId, "provider_detail".provider_detail_id as id, "provider_detail".email as email, "notification_preference".email as emailNotificationsEnabled, "notification_preference".consultation_reminder_min as consultationReminderMin, "provider_detail".name as provider_name, "provider_detail".patronym as provider_patronym, "provider_detail".surname as provider_surname, "user".language
        FROM "user"
          INNER JOIN "provider_detail" ON "user".provider_detail_id = "provider_detail".provider_detail_id
          INNER JOIN "notification_preference" ON "user".notification_preference_id = "notification_preference".notification_preference_id
        WHERE "user".deleted_at is NULL AND "user".provider_detail_id = ANY($1::UUID[]) AND "notification_preference".consultation_reminder = true
      `,
    [providerIds]
  );

export const getAllProvidersQuery = async ({ poolCountry }) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT "user".user_id as userId, "provider_detail".provider_detail_id as id, "provider_detail".email as email, "notification_preference".email as emailNotificationsEnabled, "user".language
        FROM "user"
          INNER JOIN "provider_detail" ON "user".provider_detail_id = "provider_detail".provider_detail_id
          INNER JOIN "notification_preference" ON "user".notification_preference_id = "notification_preference".notification_preference_id
        WHERE "user".deleted_at is NULL AND "notification_preference".email = true
      `
  );
