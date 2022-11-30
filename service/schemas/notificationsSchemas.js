import * as yup from "yup";

export const getNotificationsByUserIdSchema = yup.object().shape({
  country: yup.string().required(),
  userId: yup.string().uuid().required(),
});

export const updateNotificationIsReadSchema = yup.object().shape({
  country: yup.string().required(),
  language: yup.string().required(),
  notificationId: yup.string().uuid().required(),
});
