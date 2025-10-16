import schedule from "node-schedule";

import {
  remindConsultationStartJob,
  remindAddMoreAvailabilitySlotsJob,
  generateReportJob,
  remindConsultationHasStartedJob,
  remindMoodTrackerJob,
  remindConsultation24Or48HoursBeforeJob,
  remindBaselineAssessmentFollowUpJob,
  generateWeeklyMoodTrackReportsJob,
} from "#utils/jobs";
import { getAllActiveCountries } from "#queries/countries";

const rule = new schedule.RecurrenceRule();

rule.tz = "UTC";

const countryJobs = [
  {
    country: "KZ",
    hour: "13", // 18:00 UTC
    minutes: "00",
  },
  {
    country: "RO",
    hour: "15", // 18:00 UTC
    minutes: "00",
  },
  {
    country: "PL",
    hour: "17", // 18:00 UTC
    minutes: "00",
  },
  {
    country: "AM",
    hour: "14", // 18:00 UTC
    minutes: "00",
  },
];

export const scheduleJobs = () => {
  // Run every five minutes
  schedule.scheduleJob("*/5 * * * *", async () => {
    await remindConsultationStartJob();
  });

  schedule.scheduleJob("0 */1 * * *", async () => {
    // 24 hours before the consultations
    await remindConsultation24Or48HoursBeforeJob(true);
  });

  schedule.scheduleJob("0 */1 * * *", async () => {
    // 48 hours before the consultations
    await remindConsultation24Or48HoursBeforeJob(false);
  });

  // Run every hour
  schedule.scheduleJob("0 */1 * * *", async () => {
    await remindConsultationHasStartedJob();
  });

  // Run once a day at 23:59 PM
  schedule.scheduleJob("59 23 * * *", async () => {
    await remindAddMoreAvailabilitySlotsJob();
  });

  // Run every Sunday at 23:59 PM
  schedule.scheduleJob("59 23 * * 0", async () => {
    await generateReportJob("week");
  });

  // Run every last day of the month at 23:59 PM
  schedule.scheduleJob("59 23 L * *", async () => {
    await generateReportJob("month");
  });

  // Schedule baseline assessment follow-up job to run daily at 13:00 AM
  schedule.scheduleJob("34 15 * * *", async () => {
    await remindBaselineAssessmentFollowUpJob("RO");
  });

  // Run every Monday at 05:00 AM UTC
  schedule.scheduleJob("0 5 * * 1", async () => {
    await generateWeeklyMoodTrackReportsJob("RO");
  });

  getAllActiveCountries().then((res) => {
    const countries = res.rows;

    for (const country of countries) {
      const alpha2 = country.alpha2;
      const countryTime = countryJobs.find((c) => c.country === alpha2) || {
        hour: "18",
        minutes: "00",
      };

      schedule.scheduleJob(
        `${countryTime.minutes} ${countryTime.hour} * * *`,
        async () => {
          await remindMoodTrackerJob(alpha2);
        }
      );
    }
  });
};
