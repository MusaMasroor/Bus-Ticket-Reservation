import { validationResult } from 'express-validator';

/**
 * Runs after express-validator check() chains.
 * If there are validation errors, returns 400 with the first error message.
 * Otherwise calls next() to proceed to the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

export default validate;
