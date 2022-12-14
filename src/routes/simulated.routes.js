const { Router } = require('express');

const {
  createSimulated,
  answerSimulated,
  consultAnswers,
  listSimulated,
  getRandomQuestions,
  finishSimulated,
} = require('../controllers/simulated');

const { validateParams, validateBody } = require('../middlewares/validateRequest');
const authentication = require('../middlewares/authentication');
const validateAccessPermission = require('../middlewares/validateAccessPermission');

const { validateUuidSchema, validateUuidSchemaListQuestions } = require('../helpers/validators/genericSchema');
const { createSimulatedSchema, simulatedIdSchema, answerSimulatedSchema } = require('../helpers/validators/simulatedSquema');

const routes = Router();

routes.get(
  '/simulated/:simulatedId/user/:userId',
  authentication,
  validateAccessPermission(['super admin', 'student']),
  validateParams(validateUuidSchemaListQuestions),
  getRandomQuestions,
);

routes.get(
  '/simulated/:id/answers',
  authentication,
  validateAccessPermission(['super admin', 'student']),
  validateParams(validateUuidSchema),
  consultAnswers,
);

routes.get(
  '/simulated/:id',
  authentication,
  validateAccessPermission(['super admin', 'student']),
  validateParams(validateUuidSchema),
  listSimulated,
);

// Refactor: Aplicar middlawares
routes.post(
  '/simulated',
  authentication,
  validateAccessPermission(['student']),
  validateBody(createSimulatedSchema),
  createSimulated,
);

routes.patch(
  '/simulated/finish',
  authentication,
  validateAccessPermission(['student']),
  validateBody(simulatedIdSchema),
  finishSimulated,
);

routes.patch(
  '/simulated',
  authentication,
  validateAccessPermission(['student']),
  validateBody(answerSimulatedSchema),
  answerSimulated,
);

module.exports = routes;
