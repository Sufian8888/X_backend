const express = require('express');
const {
  listPosts,
  createPost,
  updatePost,
  deletePost,
} = require('../controllers/postController');

const postRouter = express.Router();

postRouter.get('/', listPosts);
postRouter.post('/', createPost);
postRouter.put('/:id', updatePost);
postRouter.delete('/:id', deletePost);

module.exports = {
  postRouter,
};
