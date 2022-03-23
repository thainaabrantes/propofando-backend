const knexConfig = require("../../knexfile")
const knex = require("knex")(knexConfig)

const { BaseRepository } = require("@cubos/knex-repository");

class QuestionRepository extends BaseRepository {
    constructor() {
        super(knex, "questions");
    }

    async getQuestion(id) {
        const question = await knex('questions as q')
            .leftJoin('alternatives as a', 'a.questionId', 'q.id')
            .select(
                'q.id',
                'q.title',
                'q.description',
                'q.category',
                'q.image',
                'q.explanationVideo',
                'q.explanationText',
                knex.raw("JSON_AGG(JSON_BUILD_OBJECT('id', a.id, 'description', a.description, 'correct', a.correct)) as alternatives"),
            )
            .where('q.id', id)
            .groupBy('q.id')
            .returning('*');
    
        return question;
    }

    async getQuestions(pageNumber, size) {
        pageNumber = pageNumber || 1;
        size = size || 6;
        
        const rowCount = await knex('questions as q')
            .count('*');

        const { count } = rowCount[0];

        const numberOfPages = Math.ceil(count / size);

        const page = (pageNumber - 1) * size;

        const questions = await knex('questions as q')
            .leftJoin('alternatives as a', 'a.questionId', 'q.id')
            .select(
                'q.id',
                'q.title',
                'q.description',
                'q.category',
                'q.image',
                'q.explanationVideo',
                'q.explanationText',
                knex.raw("JSON_AGG(JSON_BUILD_OBJECT('id', a.id, 'description', a.description, 'correct', a.correct)) as alternatives"),
            )
            .groupBy('q.id')
            .limit(size)
            .offset(page)
            .returning('*');
    
        questions.totalItems = count;
        questions.totalPages = numberOfPages >= 1 ? numberOfPages : 1;
        questions.currentPage = parseInt(pageNumber, 10);

        return questions;
    }
}

module.exports = { QuestionRepository };