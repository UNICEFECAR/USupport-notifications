import {
  getAllConsultationsInRangeQuery,
  getConsultationsStartingNow,
  updateClientConsultationReminderSentQuery,
  updateProviderConsultationReminderSentQuery,
} from "#queries/consultations";

import {
  getClientsDetailsForUpcomingConsultationsQuery,
  getProvidersDetailsForUpcomingConsultationsQuery,
  getAllProvidersQuery,
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
} from "#utils/helperFunctions";
import { getMultipleClientsNamesByIDs } from "#queries/clients";
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
