const yup = require('yup');
const { pt } = require('yup-locales');
const { setLocale } = require('yup');

setLocale(pt);

const createSimulatedSchema = yup.object().shape({
  name: yup.string(),

  userId: yup.string()
    .uuid('Formato não corresponde a um uuid')
    .required('É necessário fornecer o identificador do usuário.'),

  quantityQuestions: yup.number()
    .positive('Informe um número maior que zero')
    .required('Quantidade de questões é obrigatório'),

  categories: yup.array().of(
    yup.object().shape({
      id: yup.string().uuid('Selecione uma categoria válida'),
    }).required(),
  ),
});

const simulatedIdSchema = yup.object().shape({
  simulatedId: yup.string()
    .uuid('Formato não corresponde a um uuid')
    .required('É necessário fornecer o identificador do simulado.'),
});

const answerSimulatedSchema = yup.object().shape({
  id: yup.string()
    .uuid('Formato não corresponde a um uuid'),

  alternativeId: yup.string()
    .uuid('Formato não corresponde a um uuid'),
});

module.exports = {
  createSimulatedSchema,
  simulatedIdSchema,
  answerSimulatedSchema,
};
