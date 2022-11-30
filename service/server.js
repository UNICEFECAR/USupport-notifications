import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";

import v1 from "#routes/index";
import middleware from "#middlewares/index";

import { consumeNotificationMessages } from "#utils/kafkaConsumers";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

/*------------- Security Config -------------*/

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());

/*------------- Notifications Service Endpoints -------------*/

// Example router
app.use("/notifications/v1/", v1.NotificationsRouter);

/*------------- Error middleware -------------*/

app.use(middleware.errorMiddleware.notFound);
app.use(middleware.errorMiddleware.errorHandler);

app.listen(PORT, () => {
  console.log(`Notifications Server listening on port ${PORT}`);

  consumeNotificationMessages()
    .then(() => console.log("Kafka Consumer Running..."))
    .catch(console.log);
});
