'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Comment extends Model {
        static associate(models) {
            Comment.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
                onDelete: 'CASCADE',
            });

            Comment.belongsTo(models.Video, {
                foreignKey: 'video_id',
                targetKey: 'id',
                as: 'video',
                onDelete: 'CASCADE',
            });

            Comment.hasMany(models.Comment, {
                foreignKey: 'parent_id',
                as: 'reply_comments',
            });
            Comment.belongsTo(models.Comment, {
                foreignKey: 'parent_id',
                targetKey: 'id',
                as: 'reply_to',
                onDelete: 'SET NULL',
            });

            Comment.belongsToMany(models.User, {
                through: {
                    model: models.Like,
                    unique: false,
                    scope: { likeable_type: 'comment' },
                },
                as: 'liked_users',
                foreignKey: 'likeable_id',
                constraints: false,
            });
        }
    }
    Comment.init(
        {
            user_id: DataTypes.INTEGER,
            video_id: DataTypes.INTEGER,
            is_author_video: DataTypes.BOOLEAN,
            comment: DataTypes.STRING,
            tags: DataTypes.JSON,
            parent_id: DataTypes.INTEGER,
            path: DataTypes.STRING,
        },
        {
            sequelize,
            modelName: 'Comment',
        }
    );
    return Comment;
};
