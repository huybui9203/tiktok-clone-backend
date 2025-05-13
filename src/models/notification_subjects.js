'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Notification_subjects extends Model {
        static associate(models) {
            Notification_subjects.belongsTo(models.Notification, {
                foreignKey: 'notification_id',
                targetKey: 'id',
                as: 'belong_to_notification',
                onDelete: 'CASCADE',
            });

            Notification_subjects.belongsTo(models.Subject, {
                foreignKey: 'subject_id',
                targetKey: 'id',
                as: 'subject',
                onDelete: 'CASCADE',
            });
        }
    }
    Notification_subjects.init(
        {
            notification_id: DataTypes.INTEGER,
            subject_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Notification_subjects',
        }
    );
    return Notification_subjects;
};
