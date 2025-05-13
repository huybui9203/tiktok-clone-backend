'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Reports', {
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
            reportable_type: {
                type: Sequelize.ENUM('video', 'comment', 'group', 'user'),
            },
            reportable_id: {
                type: Sequelize.INTEGER,
            },
            reason_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'Report_reasons',
                    key: 'id',
                },
                onDelete: 'set null',
            },
            is_resolved: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            action: {
                type: Sequelize.ENUM('not', 'delete', 'keep'),
                allowNull: false,
                defaultValue: 'not',
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
        await queryInterface.dropTable('Reports');
    },
};
