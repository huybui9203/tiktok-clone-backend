'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Tags extends Model {
        static associate(models) {
            Tags.belongsTo(models.Video, {
                foreignKey: 'taggable_id',
                constraints: false,
            });

            Tags.belongsTo(models.Comment, {
                foreignKey: 'taggable_id',
                constraints: false,
            });
        }
    }
    Tags.init(
        {
            start: DataTypes.INTEGER,
            end: DataTypes.INTEGER,
            tag_name: DataTypes.STRING,
            taggable_type: DataTypes.STRING,
            taggable_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Tags',
        }
    );
    return Tags;
};
