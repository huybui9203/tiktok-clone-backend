'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Share extends Model {
        static associate(models) {
            Share.belongsTo(models.Video, {
                foreignKey: 'video_id',
                targetKey: 'id',
                as: 'video',
                onDelete: 'CASCADE',
            });

            Share.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
                onDelete: 'CASCADE',
            });
        }
    }
    Share.init(
        {
            user_id: DataTypes.INTEGER,
            video_id: DataTypes.INTEGER,
            method: DataTypes.ENUM('repost', 'message'),
            caption: DataTypes.STRING,
            recipient_id: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Share',
        }
    );
    return Share;
};
