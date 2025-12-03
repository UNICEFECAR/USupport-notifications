import { getDBPool } from "#utils/dbConfig";

export const getAllActiveProvidersWithAvailabilitySlotsForLessThanWeekQuery =
  async ({ poolCountry }) =>
    await getDBPool("piiDb", poolCountry).query(
      `
        WITH providers AS (
          SELECT
            u.user_id,
            pd.provider_detail_id,
            pd.email,
            np.email AS email_notifications_enabled,
            u.language
          FROM "user" u
          JOIN "provider_detail" pd ON u.provider_detail_id = pd.provider_detail_id
          JOIN "notification_preference" np ON u.notification_preference_id = np.notification_preference_id
          WHERE u.deleted_at IS NULL
            AND pd.status = 'active'
        ),
        slot_union AS (
          -- Regular slots (timestamptz[])
          SELECT
            a.provider_detail_id,
            s.slot_dt
          FROM "availability" a
          LEFT JOIN LATERAL unnest(COALESCE(a.slots, ARRAY[]::timestamptz[])) AS s(slot_dt) ON TRUE
          WHERE a.start_date >= (now() - interval '7 days')

          UNION ALL

          -- Campaign slots (jsonb array of objects; each has "time")
          SELECT
            a.provider_detail_id,
            CASE
              WHEN cs.elem ? 'time' AND NULLIF(BTRIM(cs.elem->>'time'), '') IS NOT NULL
              THEN (cs.elem->>'time')::timestamptz
              ELSE NULL::timestamptz
            END AS slot_dt
          FROM "availability" a
          LEFT JOIN LATERAL (
            SELECT elem
            FROM jsonb_array_elements(
              CASE
                WHEN a.campaign_slots IS NULL THEN '[]'::jsonb
                WHEN jsonb_typeof(a.campaign_slots) = 'array' THEN a.campaign_slots
                ELSE '[]'::jsonb
              END
            ) AS elem
          ) cs ON TRUE
          WHERE a.start_date >= (now() - interval '7 days')
        ),
        rows AS (
          SELECT
            p.user_id,
            p.provider_detail_id,
            p.email,
            p.email_notifications_enabled,
            p.language,
            su.slot_dt
          FROM providers p
          LEFT JOIN slot_union su
            ON su.provider_detail_id = p.provider_detail_id
        )
        SELECT
          user_id                              AS "userId",
          provider_detail_id                   AS id,
          email,
          email_notifications_enabled          AS "emailNotificationsEnabled",
          language,
          MAX(slot_dt)                         AS "lastSlot",
          COUNT(*) FILTER (
            WHERE slot_dt >= now() AND slot_dt < (now() + interval '7 days')
          )                                     AS "slotsNext7Days",
          COALESCE(BOOL_OR(
            slot_dt >= now() AND slot_dt < (now() + interval '7 days')
          ), FALSE)                             AS "hasSlotNext7Days"
        FROM rows
        GROUP BY user_id, provider_detail_id, email, email_notifications_enabled, language;

    `
    );
