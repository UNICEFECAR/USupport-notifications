import { Kafka } from "kafkajs";

import { handleNotificationConsumerMessage } from "./helperFunctions.js";

const kafka = new Kafka({
  clientId: "notificationsAPI",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-service-group" });

export const consumeNotificationMessages = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "send-notification", fromBeginning: true });

  await consumer.run({
    eachMessage: handleNotificationConsumerMessage,
  });
};
