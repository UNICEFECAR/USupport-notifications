import fetch from "node-fetch";

const USER_API_URL = process.env.USER_API_URL;
const USER_API_LOCAL_HOST = "http://localhost:3010";

export const populateUser = async (req, res, next) => {
  const user_id = req.header("x-user-id");

  const user = await fetch(`${USER_API_URL}/user/v1/user/${user_id}`, {
    headers: {
      ...req.headers,
      host: USER_API_LOCAL_HOST,
      "Content-type": "application/json",
    },
  })
    .then((raw) => raw.json())
    .catch(console.log);

  req.user = user;
  return next();
};
