import {
  getAllConsultationsInRangeQuery,
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

import { handleNotificationConsumerMessage } from "#utils/helperFunctions";

export const remindConsultationStartJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
    });

  // Remind all clients and providers of upcoming consultations for each country
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const poolCountry = country.alpha2;

    // Get all consultations in the next two hours
    const consultations = await getAllConsultationsInRangeQuery({
      poolCountry,
    })
      .then((res) => res.rows)
      .catch((err) => {
        console.log(
          "Error in getting all consultations in next two hours",
          err
        );
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
      .then((res) => res.rows)
      .catch((err) => {
        console.log("Error in reminding for upcoming consultations", err);
      });

    const providersDetails =
      await getProvidersDetailsForUpcomingConsultationsQuery({
        poolCountry,
        providerIds,
      })
        .then((res) => res.rows)
        .catch((err) => {
          console.log("Error in reminding for upcoming consultations", err);
        });

    // For each client and provider, send a reminder email and update the database to reflect that the reminder has been sent for that consultation
    for (let i = 0; i < clientsDetails.length; i++) {
      const client = clientsDetails[i];
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

        if (timeDiffMin <= reminderMin) {
          const shouldEmail = client.email && client.emailnotificationsenabled;

          await handleNotificationConsumerMessage({
            message: {
              value: JSON.stringify({
                channels: [shouldEmail ? "email" : "", "in-platform"],
                emailArgs: {
                  emailType: "client-consultationRemindStart",
                  recipientEmail: client.email,
                  data: {
                    minToConsultation: timeDiffMin,
                  },
                },
                inPlatformArgs: {
                  notificationType: "consultation_remind_start",
                  recipientId: client.userid,
                  country: poolCountry,
                  data: {
                    minToConsultation: timeDiffMin,
                  },
                },
                language: "en", // TODO: Get the language from the client
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
      const reminderMin = provider.consultationremindermin;

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

        if (timeDiffMin <= reminderMin) {
          const shouldEmail =
            provider.email && provider.emailnotificationsenabled;

          await handleNotificationConsumerMessage({
            message: {
              value: JSON.stringify({
                channels: [shouldEmail ? "email" : "", "in-platform"],
                emailArgs: {
                  emailType: "provider-consultationRemindStart",
                  recipientEmail: provider.email,
                  data: {
                    minToConsultation: timeDiffMin,
                  },
                },
                inPlatformArgs: {
                  notificationType: "consultation_remind_start",
                  recipientId: provider.userid,
                  country: poolCountry,
                  data: {
                    minToConsultation: timeDiffMin,
                  },
                },
                language: "en", // TODO: Get the language from the provider
              }),
            },
          }).catch(console.log);

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
};

export const remindAddMoreAvailabilitySlotsJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
    });

  // Remind providers to add more availability slots for each country
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const poolCountry = country.alpha2;

    // Get all providers who have availability slots
    const providers =
      await getAllProvidersWithAvailabilitySlotsForLessThanWeekQuery({
        poolCountry,
      })
        .then((res) => res.rows)
        .catch((err) => {
          console.log(
            "Error in getting all providers with availability slots",
            err
          );
        });

    // For each provider, add more availability slots
    for (let i = 0; i < providers?.length; i++) {
      const provider = providers[i];

      const dateInSevenDays = new Date();
      dateInSevenDays.setDate(dateInSevenDays.getDate() + 7);
      const lastAvailabilitySlot = provider.availabilityslots.sort(
        (a, b) => new Date(b) - new Date(a)
      )[0];

      if (
        lastAvailabilitySlot < dateInSevenDays &&
        lastAvailabilitySlot > new Date()
      ) {
        const shouldEmail =
          provider.email && provider.emailnotificationsenabled;

        await handleNotificationConsumerMessage({
          message: {
            value: JSON.stringify({
              channels: [shouldEmail ? "email" : "", "in-platform"],
              emailArgs: {
                emailType: "provider-availabilityRemindAddMoreSlots",
                recipientEmail: provider.email,
              },
              inPlatformArgs: {
                notificationType: "add_more_availability_slots",
                recipientId: provider.userid,
                country: poolCountry,
              },
              language: "en", // TODO: Get the language from the provider
            }),
          },
        }).catch(console.log);
      }
    }
  }
};

export const generateWeeklyReportJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
    });

  // Generate weekly report for each country
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const poolCountry = country.alpha2;

    // Gett all providers and generate weekly report
    const providers = await getAllProvidersQuery({
      poolCountry,
    })
      .then((res) => res.rows)
      .catch((err) => {
        console.log("Error in getting all providers", err);
      });

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];

      // TODO: Generate weekly report for the provider

      const shouldEmail = provider.email && provider.emailnotificationsenabled;
      console.log("send email to", provider.email);
      await handleNotificationConsumerMessage({
        message: {
          value: JSON.stringify({
            channels: [shouldEmail ? "email" : "", "in-platform"],
            emailArgs: {
              emailType: "provider-reportWeekly",
              recipientEmail: provider.email,
            },
            inPlatformArgs: {
              notificationType: "weekly_report",
              recipientId: provider.userid,
              country: poolCountry,
            },
            language: "en", // TODO: Get the language from the provider
          }),
        },
      }).catch(console.log);
    }
  }
};

export const generateMonthlyReportJob = async () => {
  // Get all the active countries from the database
  const countries = await getAllActiveCountries()
    .then((res) => res.rows)
    .catch((err) => {
      console.log("Error in getting all active countries", err);
    });

  // Generate monthly report for each country
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const poolCountry = country.alpha2;

    // Gett all providers and generate monthly report for each of them
    const providers = await getAllProvidersQuery({
      poolCountry,
    })
      .then((res) => res.rows)
      .catch((err) => {
        console.log("Error in getting all providers", err);
      });

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];

      // TODO: Generate monthly report for the provider

      const shouldEmail = provider.email && provider.emailnotificationsenabled;
      console.log("send email to", provider.email);
      await handleNotificationConsumerMessage({
        message: {
          value: JSON.stringify({
            channels: [shouldEmail ? "email" : "", "in-platform"],
            emailArgs: {
              emailType: "provider-reportMonthly",
              recipientEmail: provider.email,
            },
            inPlatformArgs: {
              notificationType: "monthly_report",
              recipientId: provider.userid,
              country: poolCountry,
            },
            language: "en", // TODO: Get the language from the provider
          }),
        },
      }).catch(console.log);
    }
  }
};
