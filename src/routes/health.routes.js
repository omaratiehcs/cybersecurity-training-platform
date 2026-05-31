const express = require('express')
const router = express.Router()

router.get('/health', (req, res) => {
    res.send('Cybersecurity Platform API Running 🚀')
})

module.exports = router