'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Subject extends Model {
        static associate(models) {
            Subject.hasMany(models.Notification_subjects, {
                foreignKey: 'subject_id',
                as: 'notification_subjects',
            });

            Subject.hasOne(models.Notification, {
                foreignKey: 'direct_object_id',
            });

            Subject.hasOne(models.Notification, {
                foreignKey: 'indirect_object_id',
            });

            Subject.hasOne(models.Notification, {
                foreignKey: 'prep_object_id',
            });
        }
    }
    Subject.init(
        {
            object_id: DataTypes.INTEGER,
            name: DataTypes.STRING,
            type: DataTypes.ENUM('user', 'video', 'comment'),
            image_url: DataTypes.STRING,
            uuid: DataTypes.UUID,
            object_link: DataTypes.STRING,
        },
        {
            sequelize,
            modelName: 'Subject',
        }
    );
    return Subject;
};
