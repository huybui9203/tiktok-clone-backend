'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Videos', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            uuid: {
                type: Sequelize.UUID,
                unique: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            thumb_url: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            file_url: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING,
            },
            music: {
                type: Sequelize.JSON,
            },
            viewable: {
                type: Sequelize.ENUM('public', 'private', 'friends'),
                allowNull: false,
                defaultValue: 'public',
            },
            allows: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: '[]',
            },
            published_at: {
                type: Sequelize.DATE,
            },
            meta: {
                type: Sequelize.JSON,
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
        await queryInterface.dropTable('Videos');
    },
    async up(queryInterface, Sequelize) {
       
        await queryInterface.changeColumn('Videos', 'thumb', {
            type: Sequelize.JSON,
        });
    },
};
