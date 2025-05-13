'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Notification extends Model {
        static associate(models) {
            Notification.hasMany(models.Notification_subjects, {
                foreignKey: 'notification_id',
                as: 'subjects',
            });

            Notification.belongsTo(models.Subject, {
                foreignKey: 'direct_object_id',
                targetKey: 'id',
                as: 'direct_object',
            });

            Notification.belongsTo(models.Subject, {
                foreignKey: 'indirect_object_id',
                targetKey: 'id',
                as: 'indirect_object',
            });

            Notification.belongsTo(models.Subject, {
                foreignKey: 'prep_object_id',
                targetKey: 'id',
                as: 'prep_object',
            });

            Notification.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
                onDelete: 'CASCADE',
            });
        }
    }
    Notification.init(
        {
            subject_count: DataTypes.INTEGER,
            direct_object_id: DataTypes.INTEGER,
            indirect_object_id: DataTypes.INTEGER,
            prep_object_id: DataTypes.INTEGER,
            type: DataTypes.ENUM(
                'like_video',
                'like_comment',
                'follow',
                'follow_back',
                'mention',
                'reply_comment',
                'comment_video'
            ),
            user_id: DataTypes.INTEGER,
            is_read: DataTypes.BOOLEAN,
            unique_key: DataTypes.STRING,
        },
        {
            sequelize,
            modelName: 'Notification',
        }
    );
    return Notification;
};
