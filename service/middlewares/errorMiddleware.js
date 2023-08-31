import * as yup from "yup";

export const getErrorResponse = (error) => {
  const getErrorStatus = () => {
    switch (true) {
      case "status" in error:
        return error.status;
      case error instanceof yup.ValidationError:
        return 400;
      default:
        return 500;
    }
  };

  const getErrorName = () => {
    switch (true) {
      case "name" in error:
        return error.name;
      case error instanceof yup.ValidationError:
        return "VALIDATION ERROR";
      default:
        return "INTERNAL SERVER ERROR";
    }
  };

  const getErrorMessage = () => {
    switch (true) {
      case "message" in error:
        return error.message;
      default:
        return "There was an internal server error, please try again later.";
    }
  };

  return {
    status: getErrorStatus(),
    name: getErrorName(),
    message: getErrorMessage(),
  };
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  //all errors pass through here
  const { name, message, status } = getErrorResponse(err);
  console.log(err);

  const errorObj = {
    error: {
      status,
      name,
      message,
    },
  };
  res.status(status).json(errorObj);
};

// eslint-disable-next-line no-unused-vars
export const notFound = (req, res, next) => {
  //501 if endpoint does not exist
  const error = new Error("Not Implemented");
  error.status = 501;
  next(error);
};
