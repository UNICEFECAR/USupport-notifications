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

// RO Database connection strings
const PII_PG_POOL_RO = new pg.Pool({
  connectionString: process.env.PII_DB_URL_RO,
});
const CLINICAL_PG_POOL_RO = new pg.Pool({
  connectionString: process.env.CLINICAL_DB_URL_RO,
});

// AM Database connection strings
const PII_PG_POOL_AM = new pg.Pool({
  connectionString: process.env.PII_DB_URL_AM,
});
const CLINICAL_PG_POOL_AM = new pg.Pool({
  connectionString: process.env.CLINICAL_DB_URL_AM,
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
      case "RO":
        if (dbType === "piiDb") return PII_PG_POOL_RO;
        else if (dbType === "clinicalDb") return CLINICAL_PG_POOL_RO;
        else throw Error("DB Type not recognized");
      case "AM":
        if (dbType === "piiDb") return PII_PG_POOL_AM;
        else if (dbType === "clinicalDb") return CLINICAL_PG_POOL_AM;
        else throw Error("DB Type not recognized");
      default:
        throw Error("DB Country not recognized");
    }
  }
};
