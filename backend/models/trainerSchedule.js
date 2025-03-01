module.exports = (sequelize, DataTypes) => {
    const TrainerSchedule = sequelize.define('TrainerSchedule', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        trainer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',  // 참조되는 user가 삭제되면 이 일정도 삭제
            onUpdate: 'CASCADE',  // 참조되는 user의 id가 업데이트되면 여기서도 업데이트
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        isBooked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        timestamps: true,
        underscored: true
    });

    return TrainerSchedule;
};
