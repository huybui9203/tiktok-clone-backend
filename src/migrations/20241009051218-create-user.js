'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            first_name: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            last_name: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            username: {
                type: Sequelize.STRING,
                unique: true,
                allowNull: false,
                defaultValue: '',
            },
            nickname: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            avatar: {
                type: Sequelize.JSON,
            },
            gender: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            bio: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            email: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            social_id: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            social_type: {
                type: Sequelize.STRING,
                defaultValue: 'email',
            },
            tick: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            date_of_birth: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            website_url: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            facebook_url: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            youtube_url: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            twitter_url: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            instagram_url: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            email_verified_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            followings_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            followers_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            likes_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            videos_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            nickname_updated_at: {
                type: Sequelize.DATE,
                defaultValue: null,
            },
            role: {
                type: Sequelize.ENUM('user', 'admin', 'super_admin'),
                defaultValue: 'user',
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM(
                    'Active',
                    'Banned',
                    'Inactive',
                    'Suspended'
                ),
                defaultValue: 'Active',
                allowNull: false,
            },
        });
    },
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Users', 'followings_count', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
        });
        await queryInterface.addColumn('Users', 'followers_count', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
        });
        await queryInterface.addColumn('Users', 'likes_count', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
        });
        await queryInterface.addColumn('Users', 'videos_count', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Users');
    },
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Users', 'status', {
            type: Sequelize.ENUM('Active', 'Banned', 'Inactive', 'Suspended'),
            defaultValue: 'Active',
            allowNull: false,
        });
    },
};
