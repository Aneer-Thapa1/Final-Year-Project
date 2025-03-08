const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const domainController = require('../controllers/domainController');



// Route to get all domains (protected) /api/domain/getAllDomains
router.get('/getAllDomains', validateToken, domainController.getAllDomains);

// Route to get a single domain by ID (protected)
router.get('/getDomainById/:domainId', validateToken, domainController.getDomainById);

// Route to get domain statistics (protected)
router.get('/getDomainStats', validateToken, domainController.getDomainStats);

// Route to create a new domain (admin only)
router.post('/createDomain', validateToken, domainController.createDomain);

// Route to update an existing domain (admin only)
router.put('/updateDomain/:domainId', validateToken, domainController.updateDomain);

// Route to delete a domain (admin only)
router.delete('/deleteDomain/:domainId', validateToken, domainController.deleteDomain);

// Route to reorder domains (admin only)
router.post('/reorderDomains', validateToken, domainController.reorderDomains);

// Export the router
module.exports = router;