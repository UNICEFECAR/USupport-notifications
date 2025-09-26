import { getDBPool } from "#utils/dbConfig";

export const getAllConsultationsInRangeQuery = async ({ poolCountry }) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `

      SELECT consultation_id as id, time, client_detail_id, provider_detail_id, client_reminder_sent, provider_reminder_sent
      FROM consultation
      WHERE time >= NOW() AND time < (NOW() + 119 * INTERVAL '1 MINUTE') AND (status = 'scheduled') AND (client_reminder_sent = false OR provider_reminder_sent = false)
      ORDER BY time ASC;

    `
  );

export const getConsultationsInWindowAroundOffset = async ({
  poolCountry,
  offsetHours = 24,
  windowMinutes = 5,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
      SELECT consultation_id as id, time, client_detail_id, provider_detail_id, client_reminder_sent, provider_reminder_sent
      FROM consultation
      WHERE time >= (NOW() + ${offsetHours} * INTERVAL '1 HOUR' - ${windowMinutes} * INTERVAL '1 MINUTE') 
        AND time < (NOW() + ${offsetHours} * INTERVAL '1 HOUR' + ${windowMinutes} * INTERVAL '1 MINUTE')
        AND (status = 'scheduled') 
      ORDER BY time ASC;
    `
  );

export const updateClientConsultationReminderSentQuery = async ({
  poolCountry,
  consultationId,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
        UPDATE consultation
        SET client_reminder_sent = true
        WHERE consultation_id = $1
      `,
    [consultationId]
  );

export const updateProviderConsultationReminderSentQuery = async ({
  poolCountry,
  consultationId,
}) =>
  await getDBPool("clinicalDb", poolCountry).query(
    `
          UPDATE consultation
          SET provider_reminder_sent = true
          WHERE consultation_id = $1
        `,
    [consultationId]
  );

export const getConsultationsStartingNow = async ({ poolCountry, time }) => {
  return await getDBPool("clinicalDb", poolCountry).query(
    `
        SELECT client_detail_id, provider_detail_id, consultation_id as id, time
        FROM consultation
        WHERE consultation.time = to_timestamp($1) AND (status = 'scheduled' OR status = 'finished')
      `,
    [time]
  );
};
