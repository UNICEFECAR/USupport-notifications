import { getDBPool } from "#utils/dbConfig";

export const getMultipleClientsNamesByIDs = async ({
  poolCountry,
  clientDetailIds,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT name, surname, nickname, client_detail_id
        FROM client_detail
        WHERE client_detail_id = ANY($1);
      `,
    [clientDetailIds]
  );

export const getClientsDetailsForMoodTrackerQuery = async ({ poolCountry }) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
        SELECT client_detail_id
        FROM mood_tracker
        WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW())
      `,
    []
  );

export const getClientDetailsExcludingQuery = async ({
  poolCountry,
  clientDetailIds,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT client_detail.client_detail_id, push_notification_tokens, "user".language
        FROM client_detail
        INNER JOIN "user" ON client_detail.client_detail_id = "user".client_detail_id
        WHERE client_detail.client_detail_id != ANY($1)
        AND "user".deleted_at IS NULL;
      `,
    [clientDetailIds]
  );

export const getClientsWithOldCompletedBaselineAssessmentsQuery = async ({
  poolCountry,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
        SELECT client_detail_id
        FROM baseline_assessment_session
        WHERE status = 'completed'
        AND completed_at <= NOW() - INTERVAL '14 days'
      `,
    []
  );

export const getClientDetailsWithPushTokensQuery = async ({
  poolCountry,
  clientDetailIds,
}) =>
  await getDBPool("piiDb", poolCountry).query(
    `
        SELECT client_detail.client_detail_id, push_notification_tokens, "user".language
        FROM client_detail
        INNER JOIN "user" ON client_detail.client_detail_id = "user".client_detail_id
        WHERE client_detail.client_detail_id = ANY($1)
        AND "user".deleted_at IS NULL
        AND push_notification_tokens IS NOT NULL;
      `,
    [clientDetailIds]
  );
