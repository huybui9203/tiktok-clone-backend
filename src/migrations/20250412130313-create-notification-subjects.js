'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Notification_subjects', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            notification_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Notifications',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            subject_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Subjects',
                    key: 'id',
                },
                onDelete: 'CASCADE',
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
        await queryInterface.dropTable('Notification_subjects');
    },

    up: async (queryInterface, Sequelize) => {
        await queryInterface.addConstraint('Notification_subjects', {
            fields: ['notification_id', 'subject_id'],
            type: 'unique',
            name: 'noti_sub_unique_constraint',
        });
    },
};
