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
