const { Router } = require('express');
require('express-async-errors');
const { globalErrorHandler } = require('../controllers/error');

const routes = Router();

const userRoutes = require('./user.routes');
const loginRoutes = require('./login.routes');
const categoriesRoutes = require('./category.routes');
const questionRoutes = require('./question.routes');
const fileRoutes = require('./upload.routes');
const simulatedRoutes = require('./simulated.routes');

routes.use(userRoutes);
routes.use(loginRoutes);
routes.use(categoriesRoutes);
routes.use(questionRoutes);
routes.use(fileRoutes);
routes.use(simulatedRoutes);

routes.use(globalErrorHandler);

module.exports = routes;
