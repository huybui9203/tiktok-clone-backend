'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Like extends Model {
        static associate(models) {
            Like.belongsTo(models.Video, {
                foreignKey: 'likeable_id',
                targetKey: 'id',
                as: 'video',
                constraints: false,
            });
        }
    }
    Like.init(
        {
            user_id: DataTypes.INTEGER,
            likeable_id: DataTypes.INTEGER,
            likeable_type: DataTypes.ENUM('video', 'comment'),
            owner_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Like',
        }
    );
    return Like;
};
