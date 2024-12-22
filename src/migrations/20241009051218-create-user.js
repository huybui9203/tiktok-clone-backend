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
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Users');
    },
};
