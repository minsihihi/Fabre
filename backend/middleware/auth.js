const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;
const verifyToken = (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다'
            });
        }
        const userToken = authHeader.split(' ')[1];
        
        const decoded = jwt.verify(userToken, secretKey);

        req.user = decoded;

        next();
    }
    catch(error){
        if(error.name == 'TokenExpiredError'){
            return req.status.json({
                success: false,
                message: '로그인이 만료되었습니다. 다시 로그인해주세요.'
            })
        }
        return req.status(401).json({
            success: false,
            message: '유효하지 않은 토큰입니다.'
        })
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


