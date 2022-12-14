const yup = require('yup');
const { pt } = require('yup-locales');
const { setLocale } = require('yup');
setLocale(pt);

const loginSchema = yup.object().shape({
  email: yup.string()
    .email()
    .required(),

  password: yup.string()
    .required(),
});

module.exports = {
  loginSchema,
};
