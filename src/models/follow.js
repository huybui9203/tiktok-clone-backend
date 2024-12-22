'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Follow extends Model {
        static associate(models) {}
    }
    Follow.init(
        {
            follower_id: DataTypes.INTEGER,
            following_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Follow',
        }
    );
    return Follow;
};
