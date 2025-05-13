'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Shares',
            {
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
                    unique: 'share_unique_constraint',
                },
                video_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'Videos',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    unique: 'share_unique_constraint',
                },
                method: {
                    type: Sequelize.ENUM('repost', 'message'),
                    allowNull: false,
                    unique: 'share_unique_constraint',
                },
                caption: {
                    type: Sequelize.STRING,
                    defaultValue: null,
                },
                recipient_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    unique: 'share_unique_constraint',
                },
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
                    share_unique_constraint: {
                        fields: [
                            'user_id',
                            'video_id',
                            'method',
                            'recipient_id',
                        ],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Shares');
    },

    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Shares', 'recipient_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            unique: 'share_unique_constraint',
        });
    },
};
