import jwt from 'jsonwebtoken';

/**
 * Signs and returns a JWT for the given user ID.
 * @param {string} id - MongoDB user _id
 * @returns {string} signed JWT
 */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export default generateToken;
