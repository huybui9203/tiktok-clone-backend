'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        async getLikeables(options) {
            const comments = await this.getComments(options);
            const videos = await this.getVideos(options);
            // Concat comments and videos in a single array of taggables
            return comments.concat(videos);
        }

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
                        likeable_type: 'comment'
                    }
                },
                foreignKey: 'user_id',
                as: 'liked_comments',
                constraints: false,
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
        },
        {
            sequelize,
            modelName: 'User',
            timestamps: true,
            hooks: {
                // afterFind: (result) => {
                //     if (Array.isArray(result)) {
                //         result.forEach((item) => {
                //             item.dataValues.createdAt = formatDate(
                //                 item.dataValues.createdAt
                //             );
                //             item.dataValues.updatedAt = formatDate(
                //                 item.dataValues.updatedAt
                //             );
                //         });
                //     } else if (result) {
                //         result.dataValues.createdAt = formatDate(
                //             result.dataValues.createdAt
                //         );
                //         result.dataValues.updatedAt = formatDate(
                //             result.dataValues.updatedAt
                //         );
                //     }
                // },
                // afterCreate: (record) => {
                //     record.dataValues.createdAt = formatDate(
                //         record.dataValues.createdAt
                //     );
                //     record.dataValues.updatedAt = formatDate(
                //         record.dataValues.updatedAt
                //     );
                // },
            },
        }
    );
    return User;
};
