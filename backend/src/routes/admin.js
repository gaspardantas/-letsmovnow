const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getUsers, updateUser, deleteUser,
  getAllListings, reactivateListing, adminDeleteListing,
  getAllThreads,
} = require('../controllers/adminController');

router.use(protect, adminOnly); // all admin routes require auth + admin role

// Users
router.get(   '/users',                 getUsers);
router.patch( '/users/:id',             updateUser);
router.delete('/users/:id',             deleteUser);

// Listings
router.get(   '/listings',              getAllListings);
router.patch( '/listings/:id/reactivate', reactivateListing);
router.delete('/listings/:id',          adminDeleteListing);

// Threads (moderation)
router.get('/threads',                  getAllThreads);

module.exports = router;
