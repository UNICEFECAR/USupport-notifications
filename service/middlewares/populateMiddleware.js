import { getUserByID } from "#queries/users";

export const populateUser = async (req, res, next) => {
  const country = req.header("x-country-alpha-2");
  const user_id = req.header("x-user-id");

  const user = await getUserByID(country, user_id)
    .then((res) => res.rows[0])
    .catch((err) => {
      throw err;
    });

  req.user = user;

  return next();
};
