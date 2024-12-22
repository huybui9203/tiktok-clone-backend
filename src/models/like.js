'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Like extends Model {
        static associate(models) {}
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
