'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Comments', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
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
            video_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Videos',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            is_author_video: {
                type: Sequelize.BOOLEAN,
            },
            comment: {
                type: Sequelize.STRING,
            },
            tags: {
                type: Sequelize.JSON,
                defaultValue: '[]',
            },
            parent_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'Comments',
                    key: 'id',
                },
                allowNull: true,
                onDelete: 'SET NULL',
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
        await queryInterface.dropTable('Comments');
    },
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Comments', 'path', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },
};
