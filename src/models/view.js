'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class View extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    View.init(
        {
            user_id: DataTypes.INTEGER,
            video_id: DataTypes.INTEGER,
            duration: DataTypes.FLOAT,
            view_number: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'View',
        }
    );
    return View;
};
