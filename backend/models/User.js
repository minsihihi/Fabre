module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username:{
            type:DataTypes.STRING(50),
            allowNull:false,
            unique:true
        },
        password:{
            type:DataTypes.STRING(255),
            allowNull:false
        },
        role:{
            type:DataTypes.ENUM('member', 'trainer'),
            allowNull:false
        }
    },{
        timestamps:true,
        underscored:true
    });

    return User;
}