'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Messages', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            content: {
                type: Sequelize.TEXT,
            },
            sender_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            reply_to_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'Messages',
                    key: 'id',
                },
                allowNull: true,
                onDelete: 'SET NULL',
            },
            conversation_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Conversations',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            shared_data: {
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
        await queryInterface.dropTable('Messages');
    },
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Messages', 'type', {
            type: Sequelize.ENUM('text', 'attachment', 'shared_post'),
            allowNull: false,
        });
        // await queryInterface.renameColumn(
        //     'Messages',
        //     'media_file',
        //     'shared_data'
        // );
        // await queryInterface.changeColumn('Messages', 'media_file', {
        //     type: Sequelize.JSON,
        // });
    },
};
