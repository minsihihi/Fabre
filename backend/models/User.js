module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        login_id:{
            type:DataTypes.STRING(30),
            allowNull:false,
            unique:true,
            validate:{
                len:[4, 30],
                isAlphanumeric:true
            }
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