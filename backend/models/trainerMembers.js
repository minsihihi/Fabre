module.exports = (sequelize, DataTypes) => {
    const TrainerMembers = sequelize.define('TrainerMembers', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        trainerId:{
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        memberId:{
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        startDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        status:{
            type:DataTypes.ENUM('active', 'inactive'),
            defaultValue:'active',
        },
        sessionsLeft: { // 회원 남은 횟수 기록
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },{
        timestamps: false,
    });

    TrainerMembers.associate = function(models) {
        TrainerMembers.belongsTo(models.User, {
            foreignKey: 'trainerId',
            as: 'trainer'
        });
        TrainerMembers.belongsTo(models.User, {
            foreignKey: 'memberId',
            as: 'member'
        });
    };

    return TrainerMembers;
}