'use strict';
module.exports = (sequelize, DataTypes) => {
    const TrainerMembers = sequelize.define('TrainerMembers', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        trainerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        memberId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        startDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active'
        },
        sessionsLeft: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'trainer_members',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
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
};
