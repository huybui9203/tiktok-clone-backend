'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Conversation_members',
            {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER,
                },
                conversation_id: {
                    type: Sequelize.INTEGER,
                    references: {
                        model: 'Conversations',
                        key: 'id',
                    },
                    allowNull: false,
                    unique: 'join_conversation_unique_constraint',
                    onDelete: 'CASCADE',
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    references: {
                        model: 'Users',
                        key: 'id',
                    },
                    allowNull: false,
                    unique: 'join_conversation_unique_constraint',
                    onDelete: 'CASCADE',
                },
                last_viewed_at: {
                    allowNull: true,
                    type: Sequelize.DATE,
                },
                // last_seen_id: {
                //     allowNull: true,
                //     type: Sequelize.INTEGER,
                //     references: {
                //         model: 'Messages',
                //         key: 'id',
                //     },
                //     onDelete: 'set null',
                // },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
            },
            {
                uniqueKeys: {
                    join_conversation_unique_constraint: {
                        fields: ['user_id', 'conversation_id'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Conversation_members');
    },

    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'Conversation_members',
            'last_viewed_at',
            {
                allowNull: true,
                type: Sequelize.DATE,
            }
        );
        // await queryInterface.addColumn('Conversation_members', 'last_seen_id', {
        //     allowNull: true,
        //     type: Sequelize.INTEGER,
        //     references: {
        //         model: 'Messages',
        //         key: 'id',
        //     },
        //     onDelete: 'set null',
        // });
    },
};
