'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.belongsToMany(models.User, {
                through: models.Follow,
                foreignKey: 'follower_id',
                as: 'followings',
                onDelete: 'CASCADE',
            });
            User.belongsToMany(models.User, {
                through: models.Follow,
                foreignKey: 'following_id',
                as: 'followers',
                onDelete: 'CASCADE',
            });

            User.belongsToMany(models.Video, {
                through: models.Favorite,
                foreignKey: 'user_id',
                as: 'favorite_videos',
                onDelete: 'CASCADE',
            });

            User.hasMany(models.Video, { foreignKey: 'user_id', as: 'videos' });
            User.hasMany(models.Comment, {
                foreignKey: 'user_id',
                as: 'comments',
            });

            User.belongsToMany(models.Video, {
                through: {
                    model: models.Like,
                    unique: false,
                    scope: {
                        likeable_type: 'video',
                    },
                },
                foreignKey: 'user_id',
                as: 'liked_videos',
                constraints: false,
            });

            User.belongsToMany(models.Comment, {
                through: {
                    model: models.Like,
                    unique: false,
                    scope: {
                        likeable_type: 'comment',
                    },
                },
                foreignKey: 'user_id',
                as: 'liked_comments',
                constraints: false,
            });

            User.belongsToMany(models.Message, {
                through: {
                    model: models.Reaction,
                    unique: false,
                    scope: {
                        reactable_type: 'message',
                    },
                },
                foreignKey: 'user_id',
                as: 'reacted_messages',
                constraints: false,
            });

            User.belongsToMany(models.Conversation, {
                through: models.Message,
                foreignKey: 'sender_id',
                as: 'sender_messages',
                onDelete: 'SET NULL',
            });

            User.belongsToMany(models.Conversation, {
                through: models.Conversation_member,
                foreignKey: 'user_id',
                as: 'conversations',
                onDelete: 'CASCADE',
            });

            User.hasMany(models.Conversation_member, {
                foreignKey: 'user_id',
                as: 'list-members',
            });

            User.hasMany(models.Message, {
                foreignKey: 'sender_id',
            });

            User.hasMany(models.Reaction, {
                foreignKey: 'user_id',
            });

            User.hasMany(models.Notification, {
                foreignKey: 'user_id',
                as: 'notifications',
            });

            User.hasMany(models.Share, {
                foreignKey: 'user_id',
                as: 'shared_videos',
            });

            User.hasMany(models.Follow, {
                foreignKey: 'following_id',
                as: 'follower',
            });

            User.hasMany(models.Report, {
                foreignKey: 'user_id',
                as: 'reported',
            });

            User.hasMany(models.Conversation_member, {
                foreignKey: 'add_by',
            });
        }
    }
    User.init(
        {
            first_name: DataTypes.STRING,
            last_name: DataTypes.STRING,
            username: DataTypes.STRING,
            nickname: DataTypes.STRING,
            avatar: DataTypes.JSON,
            gender: DataTypes.STRING,
            bio: DataTypes.STRING,
            email: DataTypes.STRING,
            password: DataTypes.STRING,
            social_id: DataTypes.STRING,
            social_type: DataTypes.STRING,
            tick: DataTypes.BOOLEAN,
            date_of_birth: DataTypes.DATEONLY,
            website_url: DataTypes.STRING,
            facebook_url: DataTypes.STRING,
            youtube_url: DataTypes.STRING,
            twitter_url: DataTypes.STRING,
            instagram_url: DataTypes.STRING,
            email_verified_at: DataTypes.DATE,
            followings_count: DataTypes.INTEGER,
            followers_count: DataTypes.INTEGER,
            likes_count: DataTypes.INTEGER,
            videos_count: DataTypes.INTEGER,
            nickname_updated_at: DataTypes.DATE,
            role: DataTypes.ENUM('user', 'admin', 'super_admin'),
            status: DataTypes.ENUM('Active', 'Banned', 'Inactive', 'Suspended'),
        },
        {
            sequelize,
            modelName: 'User',
            timestamps: true,
        }
    );
    return User;
};
