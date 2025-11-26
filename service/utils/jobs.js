import {
  getAllConsultationsInRangeQuery,
  getConsultationsStartingNow,
  updateClientConsultationReminderSentQuery,
  updateProviderConsultationReminderSentQuery,
  getConsultationsInWindowAroundOffset,
} from "#queries/consultations";

import {
  getClientsDetailsForUpcomingConsultationsQuery,
  getProvidersDetailsForUpcomingConsultationsQuery,
  getAllProvidersQuery,
  getClientsDetailsForMoodTrackerReportQuery,
} from "#queries/users";

import { getAllActiveCountries } from "#queries/countries";

import { getAllProvidersWithAvailabilitySlotsForLessThanWeekQuery } from "#queries/availability";

import {
  getActivitiesQuery,
  getAllCampaignNamesQuery,
  getCurrencyByCountryIdQuery,
} from "#queries/providers";

import {
  handleNotificationConsumerMessage,
  getCountryLabelFromAlpha2,
  calculateMoodSummary,
} from "#utils/helperFunctions";
import { produceSendEmail } from "#utils/kafkaProducers";
import {
  getClientDetailsExcludingQuery,
  getClientsDetailsForMoodTrackerQuery,
  getMultipleClientsNamesByIDs,
  getClientsWithOldCompletedBaselineAssessmentsQuery,
  getClientDetailsWithPushTokensQuery,
  getAllMoodTrackDataForPeriodQuery,
} from "#queries/clients";

import { t } from "#translations/index";

function getReportDate(date) {
  const newDate = new Date(date);
  const day = newDate.getDate();
  const month = newDate.getMonth() + 1;
  const fullYear = newDate.getFullYear();
  const year = fullYear.toString().slice(-2);

  const formattedDate = `${day < 10 ? `0${day}` : day}.${
    month < 10 ? `0${month}` : month
  }.${year}`;

  const time = newDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formattedDate} - ${time}`;
}

export const remindConsultation24Or48HoursBeforeJob = async (
  is24HoursBefore = true
) => {
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
      return [];
    });

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    if (country.alpha2 === "PS") continue;
    const poolCountry = country.alpha2;
    const countryLabel = getCountryLabelFromAlpha2(poolCountry);

    const consultations = await getConsultationsInWindowAroundOffset({
      poolCountry,
      offsetHours: is24HoursBefore ? 24 : 48,
      windowMinutes: 5,
    })
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log(
          `Error in getting all consultations in ${
            is24HoursBefore ? 24 : 48
          } hours`,
          err
        );
        return [];
      });
    console.log(consultations);

    const clientIds = Array.from(
      new Set(
        consultations.map((consultation) => {
          if (consultation.client_reminder_sent === false) {
            return consultation.client_detail_id;
          }
        })
      )
    );

    const providerIds = Array.from(
      new Set(consultations.map((c) => c.provider_detail_id))
    );

    const clientsDetails = await getClientsDetailsForUpcomingConsultationsQuery(
      {
        poolCountry,
        clientIds,
      }
    )
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log("Error in reminding for upcoming consultations", err);
        return [];
      });

    const providersDetails =
      await getProvidersDetailsForUpcomingConsultationsQuery({
        poolCountry,
        providerIds,
      })
        .then((res) => {
          if (res.rowCount === 0) return [];
          return res.rows;
        })
        .catch((err) => {
          console.log("Error in reminding for upcoming consultations", err);
          return [];
        });

    for (let i = 0; i < clientsDetails.length; i++) {
      const client = clientsDetails[i];
      const clientLanguage = client.language;

      const clientConsultation = consultations.find(
        (consultation) =>
          consultation.client_detail_id === client.id &&
          consultation.client_reminder_sent === false
      );

      if (clientConsultation !== undefined) {
        let providerDetails = providersDetails.find(
          (x) => x.id === clientConsultation.provider_detail_id
        );
        if (!providerDetails) {
          providerDetails =
            await getProvidersDetailsForUpcomingConsultationsQuery({
              providerIds: [clientConsultation.provider_detail_id],
              poolCountry,
            })
              .then((res) => {
                if (res.rowCount === 0) {
                  console.log(
                    "Error in fetching provider details for consultation reminder",
                    clientConsultation.id
                  );
                  return {};
                }
                return res.rows[0];
              })
              .catch((err) => {
                throw err;
              });
        }

        const {
          provider_name: providerName,
          provider_patronym: providerPatronym,
          provider_surname: providerSurname,
        } = providerDetails;
        const providerFullName = providerPatronym
          ? `${providerName} ${providerPatronym} ${providerSurname}`
          : `${providerName} ${providerSurname}`;

        const shouldEmail = client.email && client.emailnotificationsenabled;

        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: [shouldEmail ? "email" : "", "in-platform", "push"],
              emailArgs: {
                emailType: "client-consultationRemindStart24or48HoursBefore",
                recipientEmail: client.email,
                recipientUserType: "client",
                data: {
                  countryLabel,
                  is24HoursBefore,
                  providerName: providerFullName,
                },
              },
              inPlatformArgs: {
                notificationType: is24HoursBefore
                  ? "consultation_remind_start_24_hours_before"
                  : "consultation_remind_start_48_hours_before",
                recipientId: client.userid,
                country: poolCountry,
                data: {
                  provider_detail_id: clientConsultation.provider_detail_id,
                  time: clientConsultation.time,
                  consultation_id: clientConsultation.id,
                },
              },
              pushArgs: {
                notificationType: is24HoursBefore
                  ? "consultation_remind_start_24_hours_before"
                  : "consultation_remind_start_48_hours_before",
                pushTokensArray: client.push_notification_tokens,
                country: poolCountry,
                data: {
                  providerName: providerFullName,
                },
              },
              language: clientLanguage,
            }),
          },
        }).catch(console.log);
      }
    }
  }
};

export const remindConsultationStartJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
      return [];
    });

  // Remind all clients and providers of upcoming consultations for each country
  for (let i = 0; i < countries?.length; i++) {
    const country = countries[i];
    if (country.alpha2 === "PS") continue;
    const poolCountry = country.alpha2;
    const countryLabel = getCountryLabelFromAlpha2(poolCountry);

    // Get all consultations in the next two hours
    const consultations = await getAllConsultationsInRangeQuery({
      poolCountry,
    })
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log(
          "Error in getting all consultations in next two hours",
          err
        );
        return [];
      });

    // Get all users details for upcoming consultations, excluding those who have already been reminded
    const clientIds = Array.from(
      new Set(
        consultations.map((consultation) => {
          if (consultation.client_reminder_sent === false) {
            return consultation.client_detail_id;
          }
        })
      )
    );

    const providerIds = Array.from(
      new Set(
        consultations.map((consultation) => {
          if (consultation.provider_reminder_sent === false) {
            return consultation.provider_detail_id;
          }
        })
      )
    );

    // Get the details of the clients and providers to be reminded
    const clientsDetails = await getClientsDetailsForUpcomingConsultationsQuery(
      {
        poolCountry,
        clientIds,
      }
    )
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log("Error in reminding for upcoming consultations", err);
        return [];
      });

    const providersDetails =
      await getProvidersDetailsForUpcomingConsultationsQuery({
        poolCountry,
        providerIds,
      })
        .then((res) => {
          if (res.rowCount === 0) return [];
          return res.rows;
        })
        .catch((err) => {
          console.log("Error in reminding for upcoming consultations", err);
          return [];
        });

    // For each client and provider, send a reminder email and update the database to reflect that the reminder has been sent for that consultation
    for (let i = 0; i < clientsDetails.length; i++) {
      const client = clientsDetails[i];
      const clientLanguage = client.language;
      const reminderMin = client.consultationremindermin;

      const clientConsultation = consultations.find(
        (consultation) =>
          consultation.client_detail_id === client.id &&
          consultation.client_reminder_sent === false
      );

      if (clientConsultation !== undefined) {
        const now = new Date();
        const consultationTime = new Date(clientConsultation.time);
        const timeDiff = consultationTime - now;
        const timeDiffMin = Math.round(timeDiff / 60000);

        let providerDetails = providersDetails.find(
          (x) => x.id === clientConsultation.provider_detail_id
        );
        if (!providerDetails) {
          providerDetails =
            await getProvidersDetailsForUpcomingConsultationsQuery({
              providerIds: [clientConsultation.provider_detail_id],
              poolCountry,
            })
              .then((res) => {
                if (res.rowCount === 0) {
                  console.log(
                    "Error in fetching provider details for consultation reminder",
                    clientConsultation.id
                  );
                  return {};
                }
                return res.rows[0];
              })
              .catch((err) => {
                throw err;
              });
        }

        const {
          provider_name: providerName,
          provider_patronym: providerPatronym,
          provider_surname: providerSurname,
        } = providerDetails;
        const providerFullName = providerPatronym
          ? `${providerName} ${providerPatronym} ${providerSurname}`
          : `${providerName} ${providerSurname}`;

        if (timeDiffMin <= reminderMin) {
          const shouldEmail = client.email && client.emailnotificationsenabled;

          await handleNotificationConsumerMessage({
            message: {
              value: JSON.stringify({
                channels: [shouldEmail ? "email" : "", "in-platform", "push"],
                emailArgs: {
                  emailType: "client-consultationRemindStart",
                  recipientEmail: client.email,
                  recipientUserType: "client",

                  data: {
                    minToConsultation: timeDiffMin,
                    countryLabel,
                  },
                },
                inPlatformArgs: {
                  notificationType: "consultation_remind_start",
                  recipientId: client.userid,
                  country: poolCountry,
                  data: {
                    minToConsultation: timeDiffMin,
                    provider_detail_id: clientConsultation.provider_detail_id,
                    time: clientConsultation.time,
                    consultation_id: clientConsultation.id,
                  },
                },
                pushArgs: {
                  notificationType: "consultation_remind_start",
                  pushTokensArray: client.push_notification_tokens,
                  country: poolCountry,
                  data: {
                    minToConsultation: timeDiffMin,
                    providerName: providerFullName,
                  },
                },
                language: clientLanguage,
              }),
            },
          }).catch(console.log);

          await updateClientConsultationReminderSentQuery({
            poolCountry,
            consultationId: clientConsultation.id,
          }).catch((err) => {
            console.log("Error in updating client consultation", err);
          });
        }
      }
    }

    for (let i = 0; i < providersDetails.length; i++) {
      const provider = providersDetails[i];
      const providerLanguage = provider.language;
      const reminderMinArr = provider.consultationremindermin.sort(
        (a, b) => b - a
      );

      const providerConsultation = consultations.find(
        (consultation) =>
          consultation.provider_detail_id === provider.id &&
          consultation.provider_reminder_sent === false
      );

      if (providerConsultation !== undefined) {
        const now = new Date();
        const consultationTime = new Date(providerConsultation.time);
        const timeDiff = consultationTime - now;
        const timeDiffMin = Math.round(timeDiff / 60000);

        const reminderMin = reminderMinArr.find((x) => x <= timeDiffMin);

        if (timeDiffMin <= reminderMin && reminderMin - timeDiffMin <= 4) {
          const shouldEmail =
            provider.email && provider.emailnotificationsenabled;

          await handleNotificationConsumerMessage({
            message: {
              value: JSON.stringify({
                channels: [shouldEmail ? "email" : "", "in-platform"],
                emailArgs: {
                  emailType: "provider-consultationRemindStart",
                  recipientEmail: provider.email,
                  recipientUserType: "provider",
                  data: {
                    minToConsultation: timeDiffMin,
                    countryLabel,
                  },
                },
                inPlatformArgs: {
                  notificationType: "consultation_remind_start",
                  recipientId: provider.userid,
                  country: poolCountry,
                  data: {
                    minToConsultation: timeDiffMin,
                    client_detail_id: providerConsultation.client_detail_id,
                    time: providerConsultation.time,
                    consultation_id: providerConsultation.id,
                  },
                },
                language: providerLanguage,
              }),
            },
          }).catch((err) => {
            console.log("Error in sending provider consultation reminder", err);
          });

          const hasSmallerReminder = reminderMinArr.some(
            (x) => x < reminderMin
          );

          if (!hasSmallerReminder) {
            await updateProviderConsultationReminderSentQuery({
              poolCountry,
              consultationId: providerConsultation.id,
            }).catch((err) => {
              console.log("Error in updating provider consultation", err);
            });
          }
        }
      }
    }
  }
};

export const remindConsultationHasStartedJob = async () => {
  const now = new Date().setHours(new Date().getHours(), 0, 0, 0) / 1000;

  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
      return [];
    });

  // Remind clients and providers that the consultation has started for each country
  for (let i = 0; i < countries?.length; i++) {
    const country = countries[i];
    if (country.alpha2 === "PS") continue;
    const poolCountry = country.alpha2;
    const countryLabel = getCountryLabelFromAlpha2(poolCountry);

    // Get all consultations that have started
    const consultations = await getConsultationsStartingNow({
      poolCountry,
      time: now,
    })
      .then((res) => {
        if (res.rowCount === 0) {
          return [];
        } else {
          return res.rows;
        }
      })
      .catch((err) => {
        console.log(
          "Error in getting all consultations that have started",
          err
        );
        return [];
      });

    // Get all the unique client and provider ids
    const clientIds = Array.from(
      new Set(consultations.map((x) => x.client_detail_id))
    );
    const providerIds = Array.from(
      new Set(consultations.map((x) => x.provider_detail_id))
    );

    const clientsDetails = await getClientsDetailsForUpcomingConsultationsQuery(
      {
        poolCountry,
        clientIds,
      }
    )
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log(
          "Error in getting clients details for consultations that have started",
          err
        );
        return [];
      });

    const providersDetails =
      await getProvidersDetailsForUpcomingConsultationsQuery({
        poolCountry,
        providerIds,
      })
        .then((res) => {
          if (res.rowCount === 0) return [];
          return res.rows;
        })
        .catch((err) => {
          console.log(
            "Error in getting providers details for consultations that have started",
            err
          );
          return [];
        });

    // For each consultation find the client and provider details and send the notification
    for (let i = 0; i < consultations.length; i++) {
      const consultation = consultations[i];
      const clientDetailId = consultation.client_detail_id;
      const providerDetailId = consultation.provider_detail_id;

      const currentClientDetails = clientsDetails.find(
        (client) => client.id === clientDetailId
      );

      const currentProviderDetails = providersDetails.find(
        (provider) => provider.id === providerDetailId
      );

      const providerFullName = currentProviderDetails.provider_patronym
        ? `${currentProviderDetails.provider_name} ${currentProviderDetails.provider_patronym} ${currentProviderDetails.provider_surname}`
        : `${currentProviderDetails.provider_name} ${currentProviderDetails.provider_surname}`;

      if (currentClientDetails) {
        const clientLanguage = currentClientDetails.language;
        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: ["email", "in-platform", "push"],
              emailArgs: {
                emailType: "client-consultationStart",
                recipientEmail: currentClientDetails.email,
                recipientUserType: "client",
                data: {
                  countryLabel,
                },
              },
              inPlatformArgs: {
                notificationType: "consultation_started",
                recipientId: currentClientDetails.userid,
                country: poolCountry,
                data: {
                  provider_detail_id: consultation.provider_detail_id,
                  time: consultation.time,
                  consultation_id: consultation.id,
                },
              },
              pushArgs: {
                notificationType: "consultation_started",
                pushTokensArray: currentClientDetails.push_notification_tokens,
                country: poolCountry,
                data: {
                  providerName: providerFullName,
                },
              },
              language: clientLanguage,
            }),
          },
        }).catch(console.log);
      }

      if (currentProviderDetails) {
        const providerLanguage = currentProviderDetails.language;
        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: ["email", "in-platform"],
              emailArgs: {
                emailType: "provider-consultationStart",
                recipientEmail: currentProviderDetails.email,
                recipientUserType: "provider",
                data: {
                  countryLabel,
                },
              },
              inPlatformArgs: {
                notificationType: "consultation_started",
                recipientId: currentProviderDetails.userid,
                country: poolCountry,
                data: {
                  client_detail_id: consultation.client_detail_id,
                  time: consultation.time,
                  consultation_id: consultation.id,
                },
              },
              language: providerLanguage,
            }),
          },
        }).catch(console.log);
      }
    }
  }
};

export const remindAddMoreAvailabilitySlotsJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
      return [];
    });

  // Remind providers to add more availability slots for each country
  for (let i = 0; i < countries?.length; i++) {
    const country = countries[i];
    if (country.alpha2 === "PS") continue;
    const poolCountry = country.alpha2;

    // Get all providers who have availability slots
    const providers =
      await getAllProvidersWithAvailabilitySlotsForLessThanWeekQuery({
        poolCountry,
      })
        .then((res) => {
          if (res.rowCount === 0) return [];
          return res.rows;
        })
        .catch((err) => {
          console.log(
            "Error in getting all providers with availability slots",
            err
          );
          return [];
        });

    for (const provider of providers ?? []) {
      const providerLanguage = provider.language;

      // Only send if provider has NO slots in the next 7 days
      if (!provider.hasSlotNext7Days) {
        const shouldEmail =
          provider.email && provider.emailNotificationsEnabled;

        const channels = ["in-platform"];
        if (shouldEmail) channels.push("email");

        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels,
              emailArgs: {
                emailType: "provider-availabilityRemindAddMoreSlots",
                recipientEmail: provider.email,
                recipientUserType: "provider",
              },
              inPlatformArgs: {
                notificationType: "add_more_availability_slots",
                recipientId: provider.userid,
                country: poolCountry,
              },
              language: providerLanguage,
            }),
          },
        }).catch(console.log);
      }
    }
  }
};

export const generateReportJob = async (type) => {
  if (type !== "week" && type !== "month") {
    throw new Error("Invalid report type");
  }
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
      return [];
    });

  // Generate weekly report for each country
  for (let i = 0; i < countries?.length; i++) {
    const country = countries[i];
    if (country.alpha2 === "PS") continue;
    const countryId = country.country_id;
    const poolCountry = country.alpha2;

    const currencySymbol = await getCurrencyByCountryIdQuery({
      poolCountry,
      countryId,
    }).then((res) => {
      if (res.rowCount > 0) {
        return res.rows[0].symbol;
      } else {
        return "";
      }
    });

    // Gett all providers who have turned on their email notifications and generate weekly report
    const providers = await getAllProvidersQuery({
      poolCountry,
    })
      .then((res) => {
        if (res.rowCount === 0) return [];
        return res.rows;
      })
      .catch((err) => {
        console.log("Error in getting all providers", err);
      });

    // Get all activities/consultations for each provider for the past week
    const providerIds = Array.from(new Set(providers.map((p) => p.id)));
    const activitiesData = await getActivitiesQuery({
      poolCountry,
      providerIds,
      type,
    }).then((res) => {
      if (res.rowCount > 0) {
        return res.rows;
      } else {
        return [];
      }
    });

    // Get all unique client id's
    const clientIds = Array.from(
      new Set(activitiesData.map((a) => a.client_detail_id))
    );

    // Get all client names
    const clientNames = await getMultipleClientsNamesByIDs({
      poolCountry,
      clientDetailIds: clientIds,
    }).then((res) => {
      if (res.rowCount > 0) {
        return res.rows;
      } else {
        return [];
      }
    });

    // Get all campaign names
    const campaignNames = await getAllCampaignNamesQuery({
      poolCountry,
    }).then((res) => {
      if (res.rowCount > 0) {
        return res.rows;
      } else {
        return [];
      }
    });

    // Create an object in which to keep which activities to which provider belong
    const providerActivities = {};

    // Attach the activities to the provider they belong to
    // and find the client and campaign names
    providerIds.forEach((id) => {
      const activities = activitiesData
        .filter((a) => a.provider_detail_id === id)
        .map((activity) => {
          const clientNameObj = clientNames.find(
            (c) => c.client_detail_id === activity.client_detail_id
          );

          const clientName =
            clientNameObj.name && clientNameObj.surname
              ? `${clientNameObj.name} ${clientNameObj.surname}`
              : clientNameObj.nickname;

          const campaignName = campaignNames.find(
            (c) => c.campaign_id === activity.campaign_id
          )?.name;

          return {
            ...activity,
            clientName,
            campaignName,
          };
        });

      providerActivities[id] = activities;
    });

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const providerLanguage = provider.language;
      const shouldEmail = provider.email && provider.emailnotificationsenabled;

      // Find the activities for the current provider
      const currentProviderActivities = providerActivities[provider.id];

      if (currentProviderActivities.length) {
        // Generate the csv string
        let csv = `${t("client")},${t("consultation_time")},${t("price")},${t(
          "campaign"
        )},${t("schedule")}\n`;

        currentProviderActivities.forEach((activity) => {
          const date = getReportDate(activity.time);
          const scheduledOn = getReportDate(activity.created_at);
          const price = activity.price
            ? `${activity.price}${currencySymbol}`
            : t("free");

          const campaign = activity.campaignName || "N/A";

          csv += `${activity.clientName},${date},${price},${campaign},${scheduledOn}\n`;
        });

        const emailType =
          type === "week" ? "provider-reportWeekly" : "provider-reportMonthly";
        const notificationType =
          type === "month" ? "weekly_report" : "monthly_report";
        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: [shouldEmail ? "email" : "", "in-platform"],
              emailArgs: {
                emailType,
                recipientEmail: provider.email,
                recipientUserType: "provider",
                data: {
                  csvData: csv,
                },
              },
              inPlatformArgs: {
                notificationType,
                recipientId: provider.userid,
                country: poolCountry,
              },
              language: providerLanguage,
            }),
          },
        }).catch(console.log);
      }
    }
  }
};

export const remindMoodTrackerJob = async (country) => {
  const clientsDetailIds = await getClientsDetailsForMoodTrackerQuery({
    poolCountry: country,
  }).then((res) => {
    if (res.rowCount > 0) {
      return res.rows.map((x) => x.client_detail_id);
    } else {
      return [];
    }
  });

  const clientsDetails = await getClientDetailsExcludingQuery({
    poolCountry: country,
    clientDetailIds: clientsDetailIds,
  }).then((res) => {
    if (res.rowCount > 0) {
      return res.rows;
    } else {
      return [];
    }
  });

  const tokensWithLangs = clientsDetails.reduce((acc, client) => {
    acc[client.language] = [
      ...(acc[client.language] || []),
      ...(client.push_notification_tokens
        ? client.push_notification_tokens
        : []),
    ];
    return acc;
  }, {});

  for (const language in tokensWithLangs) {
    const tokens = Array.from(
      new Set(tokensWithLangs[language].filter((x) => !!x))
    );

    await handleNotificationConsumerMessage({
      message: {
        value: JSON.stringify({
          channels: ["push"],
          pushArgs: {
            notificationType: "mood_tracker",
            pushTokensArray: tokens,
            country,
          },
          language,
        }),
      },
      language: language,
    }).catch(console.log);
  }
};

export const remindBaselineAssessmentFollowUpJob = async (country) => {
  try {
    // Get all clients who completed their baseline assessment 14+ days ago
    // and send them a notification to complete their baseline assessment again
    const clientsWithOldAssessments =
      await getClientsWithOldCompletedBaselineAssessmentsQuery({
        poolCountry: country,
      }).then((res) => {
        if (res.rowCount > 0) {
          return res.rows.map((x) => x.client_detail_id);
        } else {
          return [];
        }
      });

    if (clientsWithOldAssessments.length === 0) {
      return;
    }

    const clientsDetails = await getClientDetailsWithPushTokensQuery({
      poolCountry: country,
      clientDetailIds: clientsWithOldAssessments,
    }).then((res) => {
      if (res.rowCount > 0) {
        return res.rows;
      } else {
        return [];
      }
    });

    if (clientsDetails.length === 0) {
      return;
    }

    const tokensWithLangs = clientsDetails.reduce((acc, client) => {
      acc[client.language] = [
        ...(acc[client.language] || []),
        ...(client.push_notification_tokens
          ? client.push_notification_tokens
          : []),
      ];
      return acc;
    }, {});

    for (const language in tokensWithLangs) {
      const tokens = Array.from(
        new Set(tokensWithLangs[language].filter((x) => !!x))
      );

      if (tokens.length > 0) {
        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: ["push"],
              pushArgs: {
                notificationType: "baseline_assessment_followup",
                pushTokensArray: tokens,
                country,
              },
              language,
            }),
          },
        }).catch(console.log);
      }
    }
  } catch (error) {
    console.error(
      `Error in remindBaselineAssessmentFollowUpJob for ${country}:`,
      error
    );
  }
};

export const generateWeeklyMoodTrackReportsJob = async (country) => {
  // Calculate previous week's range in Romania (Europe/Bucharest) time:
  // Start: previous Monday 00:00 RO local, End: this Monday 00:00 RO local
  const timeZone = "Europe/Bucharest";

  // Convert a UTC date to a Date object representing the same instant but with RO local components
  const toRoLocal = (utcDate) =>
    new Date(utcDate.toLocaleString("en-US", { timeZone }));

  // Given RO local date parts, return the corresponding UTC Date (handles DST transitions)
  const roLocalToUtc = (y, m, d, hh = 0, mm = 0, ss = 0, ms = 0) => {
    // First, create a UTC instant from the provided components
    const guessUtcMs = Date.UTC(y, m, d, hh, mm, ss, ms);
    // Compute the RO offset at that instant
    const roAtGuess = new Date(
      new Date(guessUtcMs).toLocaleString("en-US", { timeZone })
    );
    const offsetMs = roAtGuess.getTime() - guessUtcMs;
    // Adjust to get the UTC instant corresponding to the intended RO local time
    return new Date(guessUtcMs - offsetMs);
  };

  const nowUtc = new Date();
  const nowRo = toRoLocal(nowUtc);
  const roMidnightToday = new Date(nowRo);
  roMidnightToday.setHours(0, 0, 0, 0);
  const roDay = roMidnightToday.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysSinceMondayRo = (roDay + 6) % 7; // Mon->0
  const thisMondayRo = new Date(roMidnightToday);
  thisMondayRo.setDate(roMidnightToday.getDate() - daysSinceMondayRo);
  const prevMondayRo = new Date(thisMondayRo);
  prevMondayRo.setDate(thisMondayRo.getDate() - 7);

  const endDate = roLocalToUtc(
    thisMondayRo.getFullYear(),
    thisMondayRo.getMonth(),
    thisMondayRo.getDate(),
    0,
    0,
    0,
    0
  );
  const startDate = roLocalToUtc(
    prevMondayRo.getFullYear(),
    prevMondayRo.getMonth(),
    prevMondayRo.getDate(),
    0,
    0,
    0,
    0
  );

  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();

  const countryLabel = getCountryLabelFromAlpha2(country);

  // Get ALL active clients with detailed information (email, language, notification preferences, push tokens)
  const clientsDetails = await getClientsDetailsForMoodTrackerReportQuery({
    poolCountry: country,
  })
    .then((res) => (res.rowCount > 0 ? res.rows : []))
    .catch((err) => {
      console.log("Error in getting all active clients", err);
      return [];
    });

  if (!clientsDetails.length) return;

  // Get ALL mood track data for the period to check which users logged mood
  const allMoodData = await getAllMoodTrackDataForPeriodQuery({
    poolCountry: country,
    startDate: startDateISO,
    endDate: endDateISO,
  })
    .then((res) => (res.rowCount > 0 ? res.rows : []))
    .catch((err) => {
      console.log("Error in getting all mood track data for the period", err);
      return [];
    });

  // Create a Set of client_detail_ids who logged mood in the last week
  const clientsWhoLoggedMood = new Set(
    allMoodData.map((entry) => entry.client_detail_id)
  );

  for (const client of clientsDetails) {
    try {
      const shouldEmail = client.email && client.emailnotificationsenabled;
      const hasLoggedMood = clientsWhoLoggedMood.has(client.id);

      if (hasLoggedMood) {
        // Get client's mood data for the period
        const clientMoodData = allMoodData.filter(
          (entry) => entry.client_detail_id === client.id
        );

        if (!clientMoodData.length) continue;

        // Calculate summary statistics
        const summary = calculateMoodSummary(
          clientMoodData,
          startDateISO,
          endDateISO,
          client.language,
          t
        );

        const channels = ["push"];
        if (shouldEmail) channels.push("email");

        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels,
              emailArgs: {
                emailType: "client-moodTrackerReportWeekly",
                recipientEmail: client.email,
                recipientUserType: "client",
                country: country,
                data: {
                  countryLabel,
                  summary,
                },
              },
              pushArgs: {
                notificationType: "mood_tracker_weekly_success",
                pushTokensArray: client.push_notification_tokens,
                country: country,
                data: {
                  times: clientMoodData.length,
                },
              },
              language: client.language,
            }),
          },
        }).catch(console.log);
      } else {
        const channels = ["push"];
        if (shouldEmail) channels.push("email");

        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels,
              emailArgs: {
                emailType: "client-moodTrackerReminder",
                recipientEmail: client.email,
                recipientUserType: "client",
                country: country,
                data: {
                  countryLabel,
                },
              },
              pushArgs: {
                notificationType: "mood_tracker_weekly_encouragement",
                pushTokensArray: client.push_notification_tokens,
                country: country,
              },
              language: client.language,
            }),
          },
        }).catch(console.log);
      }
    } catch (e) {
      console.log(
        `Error generating/sending mood tracker notification for client ${client.id}`,
        e
      );
      continue;
    }
  }
};

// Sends a simple daily reminder email to a fixed recipient.
// This is triggered by a scheduled job in `scheduleJobs.js`.
export const sendDailyEmailTestJob = async () => {
  try {
    await produceSendEmail({
      emailType: "system-dailyEmailTest",
      language: "en",
      data: {},
      country: null,
    });
  } catch (error) {
    console.error("Error sending daily reminder email ", error);
  }
};
