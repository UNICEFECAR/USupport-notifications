import * as yup from "yup";

export const getNotificationsByUserIdSchema = yup.object().shape({
  country: yup.string().required(),
  userId: yup.string().uuid().required(),
  pageNo: yup.number().positive().required(),
  type: yup.string().oneOf(["all", "new", "read"]).required(),
});

export const updateNotificationIsReadSchema = yup.object().shape({
  country: yup.string().required(),
  language: yup.string().required(),
  notificationIds: yup.array().of(yup.string().uuid()).required(),
});

export const getHasUnreadNotificationsByUserIdSchema = yup.object().shape({
  country: yup.string().required(),
  userId: yup.string().uuid().required(),
});

export const readAllNotificationsByUserIdSchema = yup.object().shape({
  country: yup.string().required(),
  userId: yup.string().uuid().required(),
});
