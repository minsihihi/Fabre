module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        login_id: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
            validate: {
                len: [4, 30],
                isAlphanumeric: true
            }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('member', 'trainer'),
            allowNull: false,
            defaultValue: 'member'
        }
    }, {
        tableName: 'users',  // ✅ 테이블 이름을 명확히 지정
        timestamps: true,
        underscored: true
    });

    User.associate = function(models) {
        User.hasMany(models.TrainerMembers, {
            foreignKey: 'trainerId',
            as: 'trainerMembers'
        });
        User.hasMany(models.TrainerMembers, {
            foreignKey: 'memberId',
            as: 'memberTrainers'
        });
    };

    return User;
};
