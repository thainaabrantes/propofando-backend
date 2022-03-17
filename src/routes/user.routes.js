const { Router } = require('express');

const { 
    getUsers, 
    createUser,
    deleteUser
 } = require('../controllers/user');

const { validateBody, validateParams } = require('../middlewares/validateRequest');
const authentication = require('../middlewares/authentication');
const validateAccessPermission = require('../middlewares/validateAccessPermission');

const { createUserSchema, validateUuidSchema } = require('../helpers/validators/userSquema');

const routes = Router();

routes.get(
    '/users',
     getUsers,
);

routes.post(
    '/users',
    authentication,
    validateAccessPermission(['super admin']),
    validateBody(createUserSchema),
    createUser,
);

routes.delete(
    '/users/:id',
    authentication,
    validateAccessPermission(['super admin']),
    validateParams(validateUuidSchema),
    deleteUser,
);

module.exports = routes;
