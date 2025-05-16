module.exports = (sequelize, DataTypes) => {
    const Profile = sequelize.define("Profile", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'profiles',
        timestamps: true,
        underscored: true
    });

    Profile.associate = function(models) {
        Profile.belongsTo(models.User, { foreignKey: 'userId' });
    };

    return Profile;
};
