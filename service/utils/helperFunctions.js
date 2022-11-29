export const handlePushNotificationConsumerMessage = ({ message }) => {
  const messageJSON = JSON.parse(message.value.toString());

  console.log(messageJSON);

  // TODO: Add logic to handle Push notifications
};
