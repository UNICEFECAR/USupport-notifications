import express from "express";

import { populateUser } from "#middlewares/populateMiddleware";

import {
  getNotificationsByUserId,
  updateNotificationIsRead,
} from "#controllers/notifications";

import {
  getNotificationsByUserIdSchema,
  updateNotificationIsReadSchema,
} from "#schemas/notificationsSchemas";

const router = express.Router();

router.get("/user", populateUser, async (req, res, next) => {
  /**
   * #route   GET /notifications/v1/user
   * #desc    Get notifications for the current user ID
   */
  const country = req.header("x-country-alpha-2");
  const userId = req.user.user_id;

  return await getNotificationsByUserIdSchema
    .noUnknown(true)
    .strict(true)
    .validate({ country, userId })
    .then(getNotificationsByUserId)
    .then((result) => res.status(200).send(result))
    .catch(next);
});

router.put("/is-read", async (req, res, next) => {
  /**
   * #route   PUT /notifications/v1/is-read
   * #desc    Update the read status of a given notification
   */
  const country = req.header("x-country-alpha-2");
  const language = req.header("x-language-alpha-2");

  const payload = req.body;

  return await updateNotificationIsReadSchema
    .noUnknown(true)
    .strict()
    .validate({
      country,
      language,
      ...payload,
    })
    .then(updateNotificationIsRead)
    .then((result) => res.status(200).send(result))
    .catch(next);
});

export { router };
