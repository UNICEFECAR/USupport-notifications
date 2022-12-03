import { getDBPool } from "#utils/dbConfig";

export const getAllActiveCountries = async () =>
  await getDBPool("masterDb").query(
    `
      SELECT * 
      FROM "country"
      WHERE "is_active" = true
      ORDER BY "name" DESC
        
    `
  );
