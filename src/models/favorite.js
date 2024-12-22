'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Favorite extends Model {
        static associate(models) {}
    }
    Favorite.init(
        {
            user_id: DataTypes.INTEGER,
            video_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Favorite',
        }
    );
    return Favorite;
};
