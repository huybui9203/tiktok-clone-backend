'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Conversations', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            name: {
                type: Sequelize.STRING,
            },
            creator_id: {
                type: Sequelize.INTEGER,
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
            avatar: {
                type: Sequelize.JSON,
            },
            last_msg_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Messages',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            type: {
                type: Sequelize.ENUM('self', 'direct', 'group'),
                defaultValue: 'direct',
                allowNull: false,
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Conversations');
    },

    async up(queryInterface, Sequelize) {
        // await queryInterface.changeColumn('Conversations', 'name', {
        //     type: Sequelize.STRING,
        // });

        // await queryInterface.changeColumn('Conversations', 'last_msg_id', {
        //     type: Sequelize.INTEGER,
        //     allowNull: true,
        //     references: {
        //         model: 'Messages',
        //         key: 'id',
        //     },
        //     onDelete: 'SET NULL',
        // });

        // await queryInterface.addColumn('Conversations', 'approve_mem', {
        //     allowNull: false,
        //     defaultValue: false,
        //     type: Sequelize.BOOLEAN,
        // });
    },
};
