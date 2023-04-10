import { getDBPool } from "#utils/dbConfig";

export const getActivitiesQuery = async ({
  poolCountry,
  providerIds,
  type,
}) => {
  return await getDBPool("clinicalDb", poolCountry).query(
    `
        SELECT client_detail_id, provider_detail_id, time, status, price, type, transaction_log.campaign_id , consultation.created_at
        FROM consultation
          INNER JOIN transaction_log ON consultation.consultation_id = transaction_log.consultation_id
        WHERE provider_detail_id = ANY($1) 
            AND (status = 'finished' OR (status = 'scheduled' AND now() > time + interval '1 hour'))
            AND date_trunc($2, transaction_log.created_at) = date_trunc($2, now())
            AND date_trunc('year', transaction_log.created_at) = date_trunc('year', now())
    `,
    [providerIds, type]
  );
};

export const getAllCampaignNamesQuery = async ({ poolCountry }) => {
  return getDBPool("piiDb", poolCountry).query(
    `
          SELECT campaign_id, name
          FROM campaign
    `
  );
};

export const getCurrencyByCountryIdQuery = async ({
  poolCountry,
  countryId,
}) => {
  return getDBPool("masterDb", poolCountry).query(
    `
            SELECT symbol
                FROM country_currency_links
                JOIN currency ON currency.currency_id = country_currency_links.currency_id
            WHERE country_currency_links.country_id = $1
        `,
    [countryId]
  );
};
