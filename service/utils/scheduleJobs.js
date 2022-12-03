import schedule from "node-schedule";

import {
  remindConsultationStartJob,
  remindAddMoreAvailabilitySlotsJob,
  generateWeeklyReportJob,
  generateMonthlyReportJob,
} from "#utils/jobs";

export const scheduleJobs = () => {
  // Run every five minutes
  schedule.scheduleJob("*/5 * * * *", async () => {
    await remindConsultationStartJob();
  });

  // Run once a day at 23:59 PM
  schedule.scheduleJob("59 23 * * *", async () => {
    await remindAddMoreAvailabilitySlotsJob();
  });

  // Run every Sunday at 23:59 PM
  schedule.scheduleJob("59 23 * * 0", async () => {
    await generateWeeklyReportJob();
  });

  // Run every last day of the month at 23:59 PM
  schedule.scheduleJob("59 23 L * *", async () => {
    await generateMonthlyReportJob();
  });
};
