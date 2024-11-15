const express = require('express');
const pool = require('../modules/pool');
const { rejectUnauthenticated } = require('../modules/authentication-middleware');

const router = express.Router();
//
//PIPELINE
//
/**
 * @swagger
 * /api/pipeline:
 *   get:
 *     summary: Get a list of all pipelines
 *     description: Fetches a list of all pipeline names.
 *     responses:
 *       '200':
 *         description: Successfully fetched the list of pipelines.
 *         tags:
 *          - Pipeline
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: The name of the pipeline.
 *                     example: "Volunteer Pipeline"
 *       '500':
 *         description: Internal Server Error (failure to fetch data from the database).
 */
router.get('/', (req, res) => {
  const sqlQuery = `
     SELECT 
     "name"
     FROM
     "pipeline"
  `;
  pool
    .query(sqlQuery)
    .then((result) => {
      res.json(result.rows);
    })
    .catch((error) => {
      console.error('Error fetching list of pipelines:', error);
      res.sendStatus(500);
    });
});

/**
 * @swagger
 * /api/pipeline/:pipelineId':
 *   get:
 *     summary: Get the Kanban board data with user pipeline statuses
 *     description: Fetches all users' pipeline statuses and orders them based on pipeline status order.
 *     tags:
 *       - Pipeline
 *     responses:
 *       '200':
 *         description: Successfully fetched Kanban data with user pipeline statuses.
 *         tags:
 *         - Pipeline
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   pipeline_name:
 *                     type: string
 *                     description: The name of the pipeline.
 *                     example: "Sales"
 *                   pipeline_status_id:
 *                     type: integer
 *                     description: The ID of the pipeline status.
 *                     example: 1
 *                   pipeline_status_name:
 *                     type: string
 *                     description: The name of the pipeline status.
 *                     example: "interview scheduled"
 *                   order:
 *                     type: integer
 *                     description: The order in which the pipeline status appears in the Kanban.
 *                     example: 1
 *                   user_id:
 *                     type: integer
 *                     description: The ID of the user.
 *                     example: 1
 *                   username:
 *                     type: string
 *                     description: The username of the user.
 *                     example: "john"
 *       '500':
 *         description: Internal Server Error (failure to fetch data from the database).
 */

///   will add location column later on so that internal users at a specific location can only edit pipelines for their location
router.get('/:pipelineId', (req, res) => {
  let pipelineId = req.params.pipelineId;
  const sqlQuery = `
     SELECT 
  pipeline.name AS pipeline_name,
  pipeline_status.id AS pipeline_status_id,
  pipeline_status.name AS pipeline_status_name,
  pipeline_status.order,
  "user".id AS user_id,
  "user".username
FROM 
  "user_status"
JOIN 
  pipeline_status ON "user_status".pipeline_status_id = pipeline_status.id
JOIN 
  pipeline ON pipeline_status.pipeline_id = pipeline.id
JOIN 
  "user" ON "user_status".user_id = "user".id
WHERE 
pipeline.id = $1
ORDER BY 
  pipeline_status.order;
  `;

  pool
    .query(sqlQuery, [pipelineId])
    .then((result) => {
      res.json(result.rows);
    })
    .catch((error) => {
      console.error('Error fetching Kanban data:', error);
      res.sendStatus(500);
    });
});

/**
 * @swagger
 * paths:
 *   /api/pipeline:
 *     post:
 *       summary: Create a new pipeline
 *       description: Creates a new pipeline with the provided name.
 *       tags:
 *         - Pipeline
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: The name of the pipeline.
 *                   example: "DonorPipeline"
 *               required:
 *                 - name
 *       responses:
 *         '201':
 *           description: Pipeline created successfully.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: "Pipeline created successfully."
 *         '400':
 *           description: Bad request - invalid input.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: "Invalid name provided."
 *
 */
// for future: add a reference column to location table
router.post('/', rejectUnauthenticated, (req, res) => {
  const newLogQuery = `
  INSERT INTO "pipeline" 
    ("name")
    VALUES ($1);
  `;
  pool
    .query(newLogQuery, [req.body.name])
    .then((results) => {
      console.log('Pipeline name POSTed');
      res.sendStatus(201);
    })
    .catch((error) => {
      console.log('error in POST on pipeline', error);
      res.sendStatus(400);
    });
});

/**
 * @swagger
 * api/pipeline/{id}:
 *   delete:
 *     summary: Delete a pipeline by ID
 *     description: Deletes a pipeline from the database based on the provided ID.
 *     tags:
 *         - Pipeline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the pipeline to delete.
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '204':
 *         description: Successfully deleted the pipeline, no content returned.
 *       '404':
 *         description: Pipeline with the given ID not found.
 */

router.delete('/:id', rejectUnauthenticated, (req, res) => {
  let pipelineId = req.params.id;
  let sqlQuery = 'DELETE FROM "pipeline" WHERE id=$1;';
  pool
    .query(sqlQuery, [pipelineId])
    .then((result) => {
      console.log(`Pipeline with ID ${pipelineId} deleted successfully`);
      res.sendStatus(204);
    })
    .catch((error) => {
      console.log(`Error deleting pipeline ${sqlQuery}`, error);
      res.sendStatus(500);
    });
});

/**
 * @swagger
 * api/pipeline/{id}:
 *   put:
 *     summary: Update the name of a pipeline
 *     description: Updates the name of an existing pipeline identified by the pipeline ID.
 *     tags:
 *       - Pipeline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the pipeline to update.
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: body
 *         name: name
 *         required: true
 *         description: The new name to update the pipeline with.
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "Updated Pipeline Name"
 *     responses:
 *       '200':
 *         description: Successfully updated the pipeline name.
 *       '404':
 *         description: Pipeline with the given ID not found.
 *       '500':
 *         description: Internal server error while updating the pipeline.
 */
router.put('/:id', rejectUnauthenticated, (req, res) => {
  let pipelineId = req.params.id;
  let newPipelineName = req.body.name;
  let sqlQuery = `UPDATE "pipeline" SET "name"=$1 WHERE "id"= $2;`;
  pool
    .query(sqlQuery, [newPipelineName, pipelineId])
    .then((result) => {
      console.log(`Pipeline with ID ${pipelineId} name updated successfully`);
      res.sendStatus(200);
    })
    .catch((error) => {
      console.log(`Error updating pipeline name for ID ${pipelineId}:`, error);
      res.sendStatus(500);
    });
});
//
// END PIPELINE
//

//
//PIPELINE STATUS
//

/**
 * @swagger
 * /api/pipeline/pipeline_status:
 *   post:
 *     summary: Create a new pipeline status
 *     description: Inserts a new pipeline status record into the database.
 *     tags:
 *       - Pipeline
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pipeline_id:
 *                 type: integer
 *                 description: The ID of the pipeline.
 *                 example: 1
 *               order:
 *                 type: integer
 *                 description: The order of the pipeline.
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: The name of the pipeline status.
 *                 example: "In Progress"
 *             required:
 *               - pipeline_id
 *               - order
 *               - name
 *     responses:
 *       '201':
 *         description: Pipeline status successfully created
 *       '401':
 *         description: Unauthorized
 */
router.post('/status', rejectUnauthenticated, (req, res) => {
  const newLogQuery = `
  INSERT INTO "pipeline_status" 
    ("pipeline_id", "order", "name")
    VALUES ($1, $2, $3);
  `;
  pool
    .query(newLogQuery, [req.body.pipeline_id, req.body.order, req.body.name])
    .then((results) => {
      console.log('Pipeline status POSTed');
      res.sendStatus(201);
    })
    .catch((error) => {
      console.log('error in POST on pipeline status', error);
      res.sendStatus(500);
    });
});

/**
 * @swagger
 * api/pipeline_status/{id}:
 *   delete:
 *     summary: Delete a pipeline status
 *     description: Deletes a pipeline status by its ID. If the pipeline status has related entries in other tables (e.g., user_status), they will be deleted automatically due to the cascade delete rule in the database.
 *     tags:
 *       - Pipeline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the pipeline status to delete.
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Successfully deleted the pipeline status.
 *       500:
 *         description: Internal server error. Something went wrong while processing the delete request.
 */
router.delete('/pipeline_status/:id', rejectUnauthenticated, (req, res) => {
  let pipelineStatusId = req.params.id;
  let sqlQuery = 'DELETE FROM "pipeline_status" WHERE id=$1;';
  pool
    .query(sqlQuery, [pipelineStatusId])
    .then((result) => {
      console.log(`Pipeline status with ID ${pipelineStatusId} deleted successfully`);
      res.sendStatus(204);
    })
    .catch((error) => {
      console.log(`Error deleting pipeline status ${sqlQuery}`, error);
      res.sendStatus(500);
    });
});
/**
 * @swagger
 * api/pipeline_status/{id}:
 *   put:
 *     summary: Update a pipeline status name and order
 *     description: Updates both the name and order of the pipeline status identified by the given ID.
 *     tags:
 *       - Pipeline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the pipeline status to update.
 *         schema:
 *           type: integer
 *       - in: body
 *         name: pipeline_status
 *         description: The new name and order for the pipeline status.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The new name of the pipeline status.
 *             order:
 *               type: integer
 *               description: The new order of the pipeline status.
 *     responses:
 *       200:
 *         description: Successfully updated the pipeline status.
 *       500:
 *         description: Internal server error. Something went wrong while processing the update request.
 */
router.put('pipeline_status/:id', rejectUnauthenticated, (req, res) => {
  let pipelineStatusId = req.params.id;
  let pipelineStatusOrder = req.body.order;
  let pipelineStatusName = req.body.name;
  let sqlQuery = `UPDATE "pipeline_status" SET "order"=$1, "name"=$2 WHERE "id"= $3;`;
  pool
    .query(sqlQuery, [pipelineStatusId, pipelineStatusOrder, pipelineStatusName])
    .then((result) => {
      console.log(`Pipeline with ID ${pipelineStatusId} name updated successfully`);
      res.sendStatus(200);
    })
    .catch((error) => {
      console.log(`Error updating pipeline name for ID ${pipelineStatusId}:`, error);
      res.sendStatus(500);
    });
});

//
// USER STATUS
//
/**
 * @swagger
 * /api/pipeline/userstatus:
 *   post:
 *     summary: Create a new user status
 *     description: Inserts a new user status record into the database.
 *     tags:
 *       - Pipeline
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: The ID of the user.
 *                 example: 456
 *               p_s_id:
 *                 type: integer
 *                 description: The ID of the pipeline status.
 *                 example: 123
 *             required:
 *               - user_id
 *               - p_s_id
 *     responses:
 *       '201':
 *         description: User status successfully created
 *       '500':
 *         description: Internal server error
 */
router.post('/user_status', rejectUnauthenticated, (req, res) => {
  const newLogQuery = `
  INSERT INTO "user_status" 
    ("user_id", "p_s_id")
    VALUES ($1, $2);
  `;
  pool
    .query(newLogQuery, [req.body.user_id, req.body.p_s_id])
    .then((results) => {
      console.log(
        `User status created: User ID ${req.body.user_id} moved to Pipeline Status ID ${req.body.pipeline_status_id}`
      );
      res.sendStatus(201);
    })
    .catch((error) => {
      console.error(' Error creating user status for User ID', error);
      res.sendStatus(500);
    });
});
/**
 * @swagger
 * /api/pipeline/user_status/{userId}:
 *   put:
 *     summary: Update a user's pipeline status
 *     description: Updates the pipeline status of a user, based on the provided user ID and the new pipeline status ID.
 *     tags:
 *       - Pipeline
 *     parameters:
 *       - name: userId
 *         in: path
 *         description: The ID of the user whose status is to be updated.
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pipeline_status_id:
 *                 type: integer
 *                 description: The ID of the new pipeline status the user is being moved to.
 *                 example: 2
 *             required:
 *               - pipeline_status_id
 *     responses:
 *       '200':
 *         description: Successfully updated the user's pipeline status.
 *       '500':
 *         description: Internal Server Error (failure to update user status).
 */
router.put('/user_status/:userId', rejectUnauthenticated, (req, res) => {
  const userId = req.params.userId;
  const newPipelineStatusId = req.body.pipeline_status_id;

  const updateUserStatusQuery = `
    UPDATE "user_status"
    SET "pipeline_status_id" = $1
    WHERE "user_id" = $2;
  `;

  pool
    .query(updateUserStatusQuery, [newPipelineStatusId, userId])
    .then(() => {
      console.log(`User ${userId} moved to pipeline status ${newPipelineStatusId}`);
      res.sendStatus(200);
    })
    .catch((error) => {
      console.log('Error updating user status:', error);
      res.sendStatus(500);
    });
});
/**
 * @swagger
 * /api/pipeline/user_status/{userId}:
 *   delete:
 *     summary: Delete a user's pipeline status
 *     description: Deletes the pipeline status of a user based on the provided user ID.
 *     tags:
 *       - Pipeline
 *     parameters:
 *       - name: userId
 *         in: path
 *         description: The ID of the user whose pipeline status is to be deleted.
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *     responses:
 *       '204':
 *         description: Successfully deleted the user's pipeline status.
 *       '500':
 *         description: Internal Server Error (failure to delete user status).
 */
router.put('/user_status/remove', rejectUnauthenticated, (req, res) => {
  const userId = req.body.user_id;
  const pipelineId = req.body.pipeline_id;

  const deleteUserStatusQuery = `
    DELETE FROM "user_status"
    WHERE "user_id" = $1
    and "pipeline_id" = $2;
  `;
  pool
    .query(deleteUserStatusQuery, [userId, pipelineId])
    .then(() => {
      console.log(`User status for User ID ${userId} has been deleted`);
      res.sendStatus(204);
    })
    .catch((error) => {
      console.error('Error deleting user status:', error);
      res.sendStatus(500);
    });
});
/*
 * Will need a get by pipeline id
 * Will need a get pipeline uses by id
 * will need to update pipelines and statuses
 * will need to update user statuses
 * will need to post user statuses
 *
 */

module.exports = router;
