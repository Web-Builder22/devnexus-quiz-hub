const jwt = require('jsonwebtoken');
const token = jwt.sign({ uid: 'test-user', email: 'test@example.com', role: 'student' }, process.env.JWT_SECRET || 'fallback_secret');
console.log(token);
