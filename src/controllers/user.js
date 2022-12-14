const { UserRepository } = require('../repositories/UserRepository');
const { RecoveryRepository } = require('../repositories/RecoveryRepository');
const { SimulatedRepository } = require('../repositories/SimulatedRepository');
const { SimulatedSortQuestionsRepository } = require('../repositories/SimulatedSortQuestionsRepository');
const { QuestionRepository } = require('../repositories/QuestionRepository');
const { CategoryRepository } = require('../repositories/CategoryRepository');

const userRepository = new UserRepository();
const recoveryRepository = new RecoveryRepository();
const simulatedRepository = new SimulatedRepository();
const simulatedSortQuestionsRepository = new SimulatedSortQuestionsRepository();
const questionRepository = new QuestionRepository();
const categoryRepository = new CategoryRepository();

const {
    verifyDuplicatedEmail,
    passwordEdit,
    clearUserObject,
    verifyDuplicatedEmailWithoutMe,
    formatInPercentage,
    clearTop3,
} = require('../helpers/utils');

const { encryptPassword } = require('../helpers/handlePassword');
const { addTime, checkIsValidDate } = require('../helpers/handleDate');
const { generateUuid } = require('../helpers/handleUuid');
const { generateTransaction } = require('../helpers/handleTransaction');

const { sendMail } = require('../services/sendMail');

async function getUser(request, response) {
    const { id } = request.params;

    const user = await userRepository.findOneBy({ id });

    if (!user) {
        return response.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const cleanedUser = clearUserObject(user);

    return response.status(201).json(cleanedUser);
}

async function listUsers(_, response) {
    const allUsers = await userRepository.findBy({ deleted: false, userType: 'student' });

    const listAll = await userRepository.getAllUsers();
    const numberOfQuestions = await questionRepository.getAllQuestions();
    listAll.forEach((student) => {
        if (numberOfQuestions <= 0) {
            student.corrects = 0;
        } else {
            student.corrects = ((Number(student.corrects) / numberOfQuestions).toFixed(2)) * 100;
        }
    });

    const cleanedUsers = [];

    for (const user of allUsers) {
        cleanedUsers.push(clearUserObject(user));
    }

    return response.status(201).json(listAll);
}
async function listUserPaginated(request, response) {
    const { page, size } = request.query;

    const users = await questionRepository.answeredQuestionCorrectly(page, size);
    const numberOfQuestions = await questionRepository.getAllQuestions();

    const { totalUsers, totalPages, currentPage } = users;

    users.forEach((student) => {
        if (numberOfQuestions <= 0) {
            student.corrects = 0;
        } else {
            student.corrects = ((Number(student.corrects) / numberOfQuestions).toFixed(2)) * 100;
        }
    });

    return response.status(200).json({
        users,
        totalUsers,
        totalPages,
        currentPage,
    });
}

async function createUser(request, response) {
    const { name, email } = request.body;

    const registeredEmail = await verifyDuplicatedEmail(email);
    const user = await userRepository.findOneBy({ email });
    const defaultPassword = await passwordEdit(email);

    const encryptedPassword = await encryptPassword(defaultPassword);

    if (!registeredEmail.success && user.deleted && !user.active) {
        const updateDelete = await userRepository.update({
            id: user.id,
            name,
            email,
            deleted: !user.deleted,
            active: !user.active,
            password: encryptedPassword,
            });
       if (!updateDelete) {
           return response.status(400).json({ messagem: 'Não foi possivel cadastrar o usuário' });
       }
       return response.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
    }

    if (!registeredEmail.success) {
        return response.status(400).json({ message: registeredEmail.message });
    }

    await userRepository.insert({ name, email, password: encryptedPassword });

    return response.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
}

async function deleteUser(request, response) {
    const { id } = request.params;

    const existedUser = await userRepository.get(id);

    if (!existedUser) {
        return response.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const deletedUser = await userRepository.update({ id, active: 'false', deleted: 'true' });

    if (!deletedUser) {
        return response.status(400).json({ message: 'Erro ao deletar usuário.' });
    }

    return response.status(200).json({ message: 'Usuário deletado com sucesso.' });
}

async function updateUser(request, response) {
    const { id } = request.params;
    const { name, email, password } = request.body;

    const existedUser = await userRepository.findOneBy({ id, deleted: false });

    if (!existedUser) {
        return response.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const registeredEmail = await verifyDuplicatedEmailWithoutMe(id, email);

    if (!registeredEmail.success) {
        return response.status(400).json({ message: registeredEmail.message });
    }

    let updatedUser = '';
    if (password) {
        const encryptedPassword = await encryptPassword(password);
          updatedUser = await userRepository.update({
            id, name, email, password: encryptedPassword,
           });
    } else {
        updatedUser = await userRepository.update({
            id, name, email,
           });
    }
    if (!updatedUser) {
        return response.status(400).json({ message: 'Erro ao atualizar usuário.' });
    }

    return response.status(201).json({ message: 'Usuário atualizado com sucesso.' });
}

async function recoveryPassword(request, response) {
    const { email } = request.body;

    const user = await userRepository.findOneBy({
        email,
        userType: 'student',
        active: true,
        deleted: false,
    });

    if (!user) {
        return response.status(404).json({
            message: `Não foi possível enviar um email para ${email}. Favor verifique se o email informado está correto.`,
        });
    }

    const creationDate = new Date();
    const resetToken = generateUuid(user.email);
    const expiredAt = addTime(creationDate, { hours: 1 });

    const transaction = await generateTransaction();

    const insertedInfo = await recoveryRepository.withTransaction(transaction).insert({
        token: resetToken,
        expiredAt,
        userId: user.id,
    });

    if (!insertedInfo) {
        return response.status(400).json({
            message: `Ops! Não foi possível enviar um email para ${email}.`,
        });
    }

    const mailOptions = {
        from: 'Propofando <não-responda@propofando.com>',
        to: email,
        subject: 'Redefinição de senha',
        template: 'recovery-password/index',
        context: {
            user: user.name,
            urlRecoveryPassword: `${process.env.URL_RECOVERY_PASSWORD}/${resetToken}`,
            emailContact: process.env.EMAIL_PROPOFANDO,
        },
    };

    const emailSent = await sendMail(mailOptions);

    if (!emailSent) {
      return response.status(400).json({
          message: `Não foi possível enviar um email para ${email}. Verifique o email fornecido.`,
      });
    }

    transaction.commit();

    return response.status(200).json({
        message: `O email foi enviado para ${email} com um link para resetar sua senha.`,
    });
}

async function redefinePassword(request, response) {
    const { token } = request.params;
    const { password } = request.body;

    const registeredToken = await recoveryRepository.findOneBy({ token });

    const tokenExpired = await checkIsValidDate(new Date(), registeredToken?.expiredAt);

    if (!registeredToken || tokenExpired) {
        return response.status(400).json({
            message: 'Ação inválida. Solicite novamente uma nova senha.',
        });
    }

    const encryptedPassword = await encryptPassword(password);

    const transaction = await generateTransaction();

    const { id, userId } = registeredToken;

    const updatedPassword = await userRepository
        .withTransaction(transaction)
        .update({ id: userId, password: encryptedPassword });

    if (!updatedPassword) {
      return response.status(400).json({ message: 'Não foi possível realizar a troca de senha.' });
    }

    const deleteResetToken = await recoveryRepository
        .withTransaction(transaction)
        .delete(id);

    if (!deleteResetToken) {
        return response.status(400).json({ message: 'Não foi possível realizar a troca de senha.' });
    }

    transaction.commit();

    return response.status(200).json({ message: 'Senha atualizada!' });
  }

async function reportProblem(request, response) {
    const { description } = request.body;
    const { name, email } = request.user;
    const { id: questionId } = request.params;

    const question = await questionRepository.getQuestion(questionId);

    if (!question) {
        return response.status(404).json({ message: 'Questão não encontrada.' });
    }

    const mailOptions = {
        from: `${name} <${email}>`,
        to: process.env.SUPER_ADMIN_EMAIL,
        subject: 'Reportar Problema',
        template: 'report-problem/index',
        context: {
            user: name,
            descriptionProblem: description,
            emailContact: process.env.EMAIL_PROPOFANDO,
            questionTitle: question.title,
        },
    };

    const emailSent = await sendMail(mailOptions);

    if (!emailSent) {
      return response.status(400).json({
          message: 'Não foi possível enviar um email reportando o problema.',
      });
    }

    return response.status(200).json({
        message: 'Email enviado com sucesso.',
    });
}

async function performanceUser(request, response) {
    const { id: userId } = request.params;

    const totalSimulateds = await simulatedRepository.count({ userId, active: false });

    const totalQuestionsAnswered = await simulatedSortQuestionsRepository
        .count({ userId, answered: true });

    const totalQuestionsDatabase = await questionRepository.count();

    const percentageAnswered = formatInPercentage(totalQuestionsAnswered / totalQuestionsDatabase);

    const questionsAnswered = await simulatedSortQuestionsRepository
        .findBy({ userId, answered: true });

    let totalHits = 0;
    for (const { questionId } of questionsAnswered) {
        const alternativeCorrect = await questionRepository
            .getAlternativeCorrectOfQuestion(questionId);

        totalHits += Number(await questionRepository
        .getTotalAnsweredSuchAlternative(questionId, alternativeCorrect.id, userId));
    }

    const percentageHits = formatInPercentage(totalHits / totalQuestionsAnswered);

    return response.status(200).json({ totalSimulateds, percentageAnswered, percentageHits });
}

async function top3Hits(request, response) {
    const { id: userId } = request.params;

    const top3categories = await categoryRepository.top3AnsweredCorrectly(userId);

    const top3Filtered = clearTop3(top3categories);

    return response.status(200).json(top3Filtered);
}

async function top3AnsweredIncorrectly(request, response) {
    const { id: userId } = request.params;

    const top3categories = await categoryRepository.top3AnsweredIncorrectly(userId);

    const top3Filtered = clearTop3(top3categories);

    return response.status(200).json(top3Filtered);
}

module.exports = {
    getUser,
    listUsers,
    createUser,
    deleteUser,
    updateUser,
    recoveryPassword,
    redefinePassword,
    reportProblem,
    listUserPaginated,
    performanceUser,
    top3Hits,
    top3AnsweredIncorrectly,
};
