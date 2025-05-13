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

            Video.hasMany(models.Like, {
                foreignKey: 'likeable_id',
                as: 'like_info',
                constraints: false,
                scope: { likeable_type: 'video' },
            });

            Video.hasMany(models.Comment, {
                foreignKey: 'video_id',
                as: 'comments',
            });

            Video.hasMany(models.Tags, {
                foreignKey: 'taggable_id',
                constraints: false,
                scope: {
                    taggable_type: 'video',
                },
                as: 'tags',
            });

            Video.hasMany(models.Share, {
                foreignKey: 'video_id',
                as: 'sharers',
            });

            Video.hasMany(models.Favorite, {
                foreignKey: 'video_id',
                as: 'favorite_info',
            });

            Video.belongsTo(models.Video_categories, {
                foreignKey: 'category_id',
                targetKey: 'id',
                as: 'category',
                onDelete: 'Set null',
            });

            Video.hasMany(models.Report, {
                foreignKey: 'reportable_id',
                as: 'report_info',
                constraints: false,
                scope: { reportable_type: 'video' },
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
            likes_count: DataTypes.INTEGER,
            comments_count: DataTypes.INTEGER,
            shares_count: DataTypes.INTEGER,
            views_count: DataTypes.INTEGER,
            favorites_count: DataTypes.INTEGER,
            category_id: DataTypes.INTEGER,
            status: DataTypes.ENUM('pending', 'approved', 'rejected'),
        },
        {
            sequelize,
            modelName: 'Video',
        }
    );
    return Video;
};
