'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Video extends Model {
        static associate(models) {
            Video.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
                onDelete: 'CASCADE',
            });

            Video.belongsToMany(models.User, {
                through: models.Favorite,
                foreignKey: 'video_id',
                as: 'users',
                onDelete: 'CASCADE',
            });

            Video.belongsToMany(models.User, {
                through: {
                    model: models.Like,
                    unique: false,
                    scope: { likeable_type: 'video' },
                },
                as: 'liked_users',
                foreignKey: 'likeable_id',
                constraints: false,
            });

            Video.hasMany(models.Comment, {
                foreignKey: 'video_id',
                as: 'comments',
            });
        }
    }
    Video.init(
        {
            uuid: DataTypes.UUID,
            user_id: DataTypes.INTEGER,
            thumb: DataTypes.JSON,
            file_url: DataTypes.STRING,
            description: DataTypes.TEXT,
            music: DataTypes.JSON,
            viewable: DataTypes.ENUM('public', 'private', 'friends'),
            allows: DataTypes.JSON,
            published_at: DataTypes.DATE,
            meta: DataTypes.JSON,
        },
        {
            sequelize,
            modelName: 'Video',
        }
    );
    return Video;
};
