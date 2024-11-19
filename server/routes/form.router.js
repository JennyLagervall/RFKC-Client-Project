const express = require('express');
const pool = require('../modules/pool');

const router = express.Router();

/**
 * Is there going there going to be one big form put?
 * go through and post/put/delete/archive everything that needs to be
 * 
 * Form
 *  Post form
 *  get form w/ sections
 *  update form
 *  delete form
 * 
 *  Post Sections
 *  get sections w/ questions
 * 
 *  archive questions
 * 
 * Submission
 * Post Submissions + answers in the submission
 */

router.get('/', (req, res) => {
    pool.query(`select * from forms;`).then(response => {
        res.send(response.rows).status(200);
    }).catch(err => {
        console.error('Error getting forms', err);
        res.send(500);
    })
})

router.get('/:formId/all', (req, res) => {
    const queryText = `
select 
	'Form' as "type",
	forms.id as "id",
	forms."name" as "name",
	(select
		json_agg(
			json_build_object(
				'type', 'Section',
				'id', sections.id,
				'order', sections."order",
                'name', sections."name",
				'description', sections.description,
				'questions', (select 
					json_agg(
						json_build_object(
							'type', 'Question',
							'question', question.question,
							'description', question.description,
							'order', question."order",
							'answer_type', question.answer_type,
							'multiple_choice_answers', (select 
								json_agg(
									json_build_object(
										'type', 'MCAnswer',
										'id', multiple_choice_answers.id,
										'answer', multiple_choice_answers.answer
									)
								)
								from multiple_choice_answers
								where multiple_choice_answers.question_id = question.id
							)
						)
					) from question
					where question.section_id = sections.id
                    and question.archived = false
				)
			)
		) from sections
		where sections.form_id = forms.id
	) as "sections"
from forms
where forms.id = $1
group by forms.id;
    `
    pool.query(queryText,[req.params.formId]).then(response => {
        res.send(response.rows[0]);
    }).catch(err => {
        console.error('Error grabbing the form', err);
        res.send(500);
    })
})

router.post('/', (req, res) => {
    const queryText = `
        insert into forms("name")
        values($1);
    `
    pool.query(queryText, [req.body.name]).then(response => {
        res.send(200);
    }).catch(err => {
        console.error('Error posting form', err);
        res.send(500);
    })
})

// // Form edit route
// router.put('/:formId', async (req, res) => {
//     const OldForm = req.body.OldForm;
//     const NewForm = req.body.NewForm;
//     const OldSectionIds = [];
//     const OldQuestionIds = [];
//     const OldMultipleChoiceAnswerIds = [];

//     // finding all the old IDs in order to archive/delete things
//     function idFinder(object){
//         const type = object.type;
//         if(type === 'Form'){
//             if(object.sections === null){
//                 return;
//             }
//             for(let i = 0; i < object.sections.length; i++){
//                 idFinder(object.sections[i])
//             }
//         } else if (type === 'Section'){
//             OldSectionIds.push(object.id)
//             if(object.questions === null){
//                 return;
//             }
//             for(let i = 0; i < object.questions.length; i++){
//                 idFinder(object.questions[i])
//             }
//         } else if (type === 'Question'){
//             OldQuestionIds.push(object.id);
//             if(object.multiple_choice_answers === null){
//                 return;
//             } else
//             if( object.multiple_choice_answers !== null){
//                 for(let i = 0; i < object.multiple_choice_answers.length; i++){
//                     idFinder(object.multiple_choice_answers[i])
//                 }
//             }
//         } else if (type === 'MCAnswer'){
//             OldMultipleChoiceAnswerIds.push(object.id);
//         }
//     }

//     // calling that function
//     idFinder(OldForm)

//     // query for deleting / archiving old stuff (will be used after all of the new stuff is created)
//     const deletionQueryText1 = `
//     delete from sections where sections.id in($1);
//     `
//     const deletionQueryText2 = `
//     update question
//     set archived = true,
//     updated_at = now()
//     where id in ($2);
//     `
//     const deletionQueryText3 = `
//     delete from multiple_choice_answers where multiple_choice_answers.id in ($3);
//     `
//     if(OldSectionIds.length === 0){
//         OldSectionIds.push(0);
//     }
//     if(OldQuestionIds.length < 1){
//         OldQuestionIds.push(0);
//     }
//     if(OldMultipleChoiceAnswerIds.length === 0){
//         OldMultipleChoiceAnswerIds.push(0);
//     }

//     let sectionCreationQueryText = `
//         insert into sections ("name", description, "order", form_id)
//         values 
//     `
//     let newSectionValues = ``;
//     let sanitizedSectionValues = [];
//     let sectionSanitizationTracker = 1;

//     // building the new sections query
//     for(let i = 0; i < NewForm.sections.length; i++){
//         sanitizedSectionValues.push(NewForm.sections[i].name);
//         sanitizedSectionValues.push(NewForm.sections[i].description);
//         newSectionValues += `
//         ($${sectionSanitizationTracker++}, $${sectionSanitizationTracker++}, '${NewForm.sections[i].order}', ${req.params.formId})
//         `;
//         if( i < NewForm.sections.length - 1){
//             newSectionValues += ',';
//         }
//     }

//     sectionCreationQueryText += newSectionValues;
//     sectionCreationQueryText += ` returning id;`;

//     // need to start a try/catch chain because I'll be using await to get information for new queries.
//     try {
//         if(NewForm.sections === null){
//             throw new Error('Form has no sections to add')
//         }
//         // grabbing the new sections IDs and storing them in the newSectionIds array to use later
//         console.log('Adding sections,', sectionCreationQueryText);
//         const newSectionIds = await pool.query(sectionCreationQueryText, [...sanitizedSectionValues]);
//         console.log('Sections Added.');

//         let questionCreationQueryText = `
//             insert into question("question", "description", "answer_type", "order", section_id)
//             values 
//         `;
//         let newQuestionValues = ``;
//         let sanitizedQuestionValues = [];
//         let questionSanitizationTracker = 1;
//         let AreThereQuestions = false;
//         console.log('before question loop');
//         for(let i = 0; i < NewForm.sections.length; i++){
//             if(NewForm.sections[i].questions !== null){
//             for(let j = 0; j < NewForm.sections[i].questions.length; j++){
//                 sanitizedQuestionValues.push(NewForm.sections[i].questions[j].question);
//                 sanitizedQuestionValues.push(NewForm.sections[i].questions[j].description);
//                 AreThereQuestions = true;
//                 newQuestionValues += `
//                 ($${questionSanitizationTracker++}, $${questionSanitizationTracker++}, '${NewForm.sections[i].questions[j].answer_type}', '${NewForm.sections[i].questions[j].order}', ${newSectionIds[i].id})
//                 `;
//                 if( i < NewForm.sections.length - 1 || j < NewForm.sections[i].questions.length - 1){
//                     newQuestionValues += ',';
//                 }
//             }
//             }
//         }
//         console.log('After question loop');
//         questionCreationQueryText += newQuestionValues;
//         questionCreationQueryText += ` returning id;`
//     //     if(AreThereQuestions){
//     //     const newQuestionIds = await pool.query(questionCreationQueryText, [...sanitizedQuestionValues]);
//     //     let multipleChoiceAnswerCreationText = `
//     //     insert into multiple_choice_answers( question_id, answer )
//     //     values 
//     //     `;
//     //     let newMultipleChoiceValues = ``;
//     //     let sanitizedMultipleChoiceValues = [];
//     //     let multipleChoiceSanitizationTracker = 1;
//     //     let questionCount = 0;
//     //     for(let i = 0; i < NewForm.sections.length; i++){
//     //         for(let j = 0; j < NewForm.sections[i].questions.length; j++){
//     //             if(NewForm.sections[i].questions[k].answer_type == 'dropdown' || NewForm.sections[i].questions[k].answer_type == 'multiple choice'){
//     //                 for(let k = 0; k < NewForm.sections[i].questions[j].multiple_choice_answers.length; k++){
//     //                     sanitizedMultipleChoiceValues.push(NewForm.sections[i].questions[j].multiple_choice_answers[k].answer);
//     //                     newMultipleChoiceValues += `
//     //                     ( ${newQuestionIds[questionCount]}, $${multipleChoiceSanitizationTracker++} )
//     //                     `
//     //                     newMultipleChoiceValues += ','
//     //                 }
//     //             }
//     //             questionCount++;
//     //         }
//     //     }
//     //     newMultipleChoiceValues = newMultipleChoiceValues.slice(0,-1);
//     //     multipleChoiceAnswerCreationText += newMultipleChoiceValues;
//     //     multipleChoiceAnswerCreationText += ';';
        
//     //     await pool.query(multipleChoiceAnswerCreationText, [...sanitizedMultipleChoiceValues]);
//     // }
//         console.log('deleting old stuff');
//         await pool.query(deletionQueryText1, [OldSectionIds.join(', ')]);
//         await pool.query(deletionQueryText2, [OldQuestionIds.join(', ')]);
//         // await pool.query(deletionQueryText3, [OldMultipleChoiceAnswerIds.join(', ')]);
//         console.log('done deleting stuff');
//         await pool.query('update forms set "name" = $1 where id = $2', [req.body.NewForm.name, req.params.formId])

//         res.send('Successfully Updated Form.').status(201);
//         console.log('what???');
//     } catch(error) {
//         if (error.message === 'Section count mismatch error.'){
//             res.send('Section count mismatch error.').status(500);
//         } else if (error.message === 'No questions to add'){
//             res.sendStatus(500)
//         } else {
//             console.log(error)
//         }
//     }
// })

module.exports = router;
