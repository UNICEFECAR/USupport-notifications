import { produceSendEmail } from "#utils/kafkaProducers";

import { raiseInPlatformNotification } from "#controllers/notifications";

export const handleNotificationConsumerMessage = async ({ message }) => {
  const messageJSON = JSON.parse(message.value.toString());
  /**
   * Each notification has the following properties:
   * - channel: The channel to send the notification to (e.g. email, in-platform, or push)
   * - emailArgs (optional): The arguments to pass to the email controller - contains the email type, recipient email, and email data
   * - inPlatformArgs (optional): The arguments to pass to the in-platform controller - contains the notification type, user ID, and notification data
   * - pushArgs (optional): The arguments to pass to the push controller - contains the notification type, user ID, and notification data
   * - language: The language of the notification
   */
  const { channels, emailArgs, inPlatformArgs, pushArgs, language } =
    messageJSON;

  if (channels.includes("email")) {
    produceSendEmail({
      emailType: emailArgs.emailType,
      language,
      recipientEmail: emailArgs.recipientEmail,
      data: emailArgs.data,
    });
  }
  if (channels.includes("in-platform")) {
    raiseInPlatformNotification({
      notificationType: inPlatformArgs.notificationType,
      country: inPlatformArgs.country,
      recipientId: inPlatformArgs.recipientId,
      data: inPlatformArgs.data,
    });
  }
  // TODO: uncomment when push notifications are implemented
  // if (channels.includes("push")) {
  //   raisePushNotification({
  //     notificationType: pushArgs.notificationType,
  //     language,
  //     pushToken: pushArgs.pushToken,
  //     data: pushArgs.data,
  //   });
  // }
};
