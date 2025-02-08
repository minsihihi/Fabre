const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;
const verifyToken = (req, res, next) => {
    try {
        // Authorization 헤더에서 토큰 추출
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: '토큰이 제공되지 않았습니다.' });
        }

        // Bearer 토큰에서 실제 토큰 부분만 추출
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '유효하지 않은 토큰 형식입니다.' });
        }

        // 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: '토큰이 만료되었습니다.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }
        if(!roles.includes(req.user.role)){
            return res.status(401).json({
                success: false,
                message: '접근 권한이 없습니다.'
            });
        }
        next();
    }
}

module.exports = { verifyToken, checkRole };


