import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Global Database connection strings
const MASTER_PG_POOL = new pg.Pool({
  connectionString: process.env.MASTER_DB_URL,
});

// KZ Database connection strings
const PII_PG_POOL_KZ = new pg.Pool({
  connectionString: process.env.PII_DB_URL_KZ,
});
const CLINICAL_PG_POOL_KZ = new pg.Pool({
  connectionString: process.env.CLINICAL_DB_URL_KZ,
});

// PL Database connection strings
const PII_PG_POOL_PL = new pg.Pool({
  connectionString: process.env.PII_DB_URL_PL,
});
const CLINICAL_PG_POOL_PL = new pg.Pool({
  connectionString: process.env.CLINICAL_DB_URL_PL,
});

const IS_DEV = process.env.NODE_ENV === "development";

export const getDBPool = (dbType, country) => {
  if (dbType === "masterDb") return MASTER_PG_POOL;
  else {
    if (IS_DEV) {
      if (dbType === "piiDb") return PII_PG_POOL_KZ;
      else if (dbType === "clinicalDb") return CLINICAL_PG_POOL_KZ;
    }

    switch (country) {
      case "KZ":
        if (dbType === "piiDb") return PII_PG_POOL_KZ;
        else if (dbType === "clinicalDb") return CLINICAL_PG_POOL_KZ;
        else throw Error("DB Type not recognized");
      case "PL":
        if (dbType === "piiDb") return PII_PG_POOL_PL;
        else if (dbType === "clinicalDb") return CLINICAL_PG_POOL_PL;
        else throw Error("DB Type not recognized");
      default:
        throw Error("DB Country not recognized");
    }
  }
};
