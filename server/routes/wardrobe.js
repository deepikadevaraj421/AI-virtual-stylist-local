const express = require('express');
const router = express.Router();
const {
  addItem, getItems, getItem, updateItem, deleteItem, getStats, predictItem,
  getLaundry, clearLaundryItem, clearAllLaundry, scheduleLaundry
} = require('../controllers/wardrobeController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/stats', getStats);
router.get('/laundry', getLaundry);
router.put('/laundry/clear-all', clearAllLaundry);
router.put('/laundry/:id/clear', clearLaundryItem);
router.put('/laundry/:id/schedule', scheduleLaundry);
router.post('/predict', upload.single('image'), predictItem);
router.route('/')
  .get(getItems)
  .post(upload.single('image'), addItem);

router.route('/:id')
  .get(getItem)
  .put(updateItem)
  .delete(deleteItem);

module.exports = router;
