import { t } from "#translations/index";

export const notificationNotFound = (language) => {
  const error = new Error();
  error.message = t("notification_not_found_error", language);
  error.name = "NOTIFICATION NOT FOUND";
  error.status = 404;
  return error;
};
