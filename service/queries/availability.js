import { getDBPool } from "#utils/dbConfig";

export const getAllProvidersWithAvailabilitySlotsForLessThanWeekQuery = async ({
  poolCountry,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
      SELECT "user".user_id as userId, "provider_detail".provider_detail_id as id, "provider_detail".email as email, "notification_preference".email as emailNotificationsEnabled, MAX("availability".start_date) as lastAvailabilityStartDate, MAX("availability".slots) as availabilitySlots
      FROM "user"
        INNER JOIN "provider_detail" ON "user".provider_detail_id = "provider_detail".provider_detail_id
        INNER JOIN "notification_preference" ON "user".notification_preference_id = "notification_preference".notification_preference_id
        INNER JOIN "availability" ON "user".provider_detail_id = "availability".provider_detail_id
      WHERE "user".deleted_at is NULL
      GROUP BY "user".user_id, "provider_detail".provider_detail_id, "provider_detail".email, "notification_preference".email;
    `
  );
