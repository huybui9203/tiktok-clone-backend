'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Video_categories extends Model {
        static associate(models) {
            Video_categories.hasMany(models.Video, {
                foreignKey: 'category_id',
                as: 'videos',
            });
        }
    }
    Video_categories.init(
        {
            name: DataTypes.STRING,
            description: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: 'Video_categories',
        }
    );
    return Video_categories;
};
