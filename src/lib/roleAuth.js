/* eslint-disable no-param-reassign */
const { models } = require('ias-utils');

const { userModel } = models;
function roleAuth(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  const result = [
    async (req, res, next) => {
      try {
        const { id } = req.body.decodedUser;
        const user = await userModel.findOne({
          where: {
            id,
          },
        });

        if (roles.length && !roles.includes(user.role)) {
          const error = new Error('Failed to authenticate role!');
          return next(error);
        }
        return next();
      } catch (err) {
        return next(err);
      }
    },
  ];
  return result;
}
module.exports = roleAuth;
