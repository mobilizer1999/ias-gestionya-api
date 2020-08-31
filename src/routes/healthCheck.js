const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ healthcheck: 'ok' });
});

module.exports = router;
