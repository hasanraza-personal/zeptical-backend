const jwt = require('jsonwebtoken');

const Authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ msg: "Access Denied" })
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = data.id;
        next();
    } catch (error) {
        return res.status(500).json({ msg: 'Something went wrong. Please try again.', err: error.message });
    }
}

module.exports = Authenticate;