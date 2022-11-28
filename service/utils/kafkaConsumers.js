import { Kafka } from "kafkajs";

import { handlePushNotificationConsumerMessage } from "./helperFunctions.js";

const kafka = new Kafka({
  clientId: "notificationsAPI",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-service-group" });

export const consumePushNotificationMessages = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "send-push", fromBeginning: true });

  await consumer.run({
    eachMessage: handlePushNotificationConsumerMessage,
  });
};
