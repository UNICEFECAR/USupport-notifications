import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "notificationsAPI",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();

export const produceSendEmail = async ({
  emailType,
  language,
  recipientEmail,
  data,
}) => {
  const payload = JSON.stringify({
    emailType,
    language,
    recipientEmail,
    data,
  });
  await producer.connect();
  await producer.send({
    topic: "send-email",
    messages: [{ value: payload }],
  });
};
