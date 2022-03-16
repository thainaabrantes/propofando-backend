const { Router } = require('express');

const { 
    getUsers, 
    createUser,
 } = require('../controllers/user');

const { validateBody } = require('../middlewares/validateRequest');
const authentication = require('../middlewares/authentication');
const validateAccessPermission = require('../middlewares/validateAccessPermission');

const { createUserSchema } = require('../helpers/validators/userSquema');

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

module.exports = routes;